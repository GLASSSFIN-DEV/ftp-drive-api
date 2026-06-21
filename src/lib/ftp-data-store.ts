import { DataStore, Upload } from '@tus/utils'
import { Client } from 'basic-ftp'
import type { Readable } from 'node:stream'
import { prismaProxy } from './prisma.js'
import { env } from '../config.js'
import logger from './logger.js'

export const TUS_FTP_TEMP_DIR = process.env.TUS_FTP_TEMP_DIR ?? '/tus-temp'
const DEFAULT_EXPIRY_MS = 24 * 60 * 60 * 1000

export class FtpDataStore extends DataStore {
    private readonly tempDir: string
    private readonly expirationMs: number

    constructor(opts?: { tempDir?: string; expirationMs?: number }) {
        super()
        this.tempDir = opts?.tempDir ?? TUS_FTP_TEMP_DIR
        this.expirationMs = opts?.expirationMs ?? DEFAULT_EXPIRY_MS
        this.extensions = ['creation', 'termination', 'expiration']
    }

    private async openFtp(siteId: number): Promise<Client> {
        const client = new Client()
        await client.access({
            host: env.FTP_HOST,
            port: siteId,
            user: env.FTP_USERNAME,
            password: env.FTP_PASSWORD,
            secure: env.FTP_CONFIG as boolean | 'implicit' | undefined,
            secureOptions: { rejectUnauthorized: env.NODE_REJECT_UNAUTHORIZE },
        })
        return client
    }

    // create() only writes to DB — FTP file is created lazily on first write()
    async create(upload: Upload): Promise<Upload> {
        const siteId = Number(upload.metadata?.siteId ?? 0)
        await prismaProxy.tusUpload.create({
            data: {
                id: upload.id,
                siteId,
                tempPath: `${this.tempDir}/${upload.id}`,
                size: upload.size ?? null,
                offset: 0,
                metadata: (upload.metadata ?? null) as any,
                expiresAt: new Date(Date.now() + this.expirationMs),
            },
        })
        return upload
    }

    async write(stream: Readable, id: string, offset: number): Promise<number> {
        const record = await prismaProxy.tusUpload.findUniqueOrThrow({ where: { id } })
        const ftp = await this.openFtp(record.siteId)

        try {
            // ensureDir creates the temp dir if missing and sets CWD to it
            await ftp.ensureDir(this.tempDir)

            let currentSize = 0
            try {
                currentSize = await ftp.size(id)
            } catch {
                currentSize = 0
            }

            if (offset < currentSize) {
                // idempotent retry — chunk already written, drain and return
                stream.resume()
                await new Promise<void>((resolve, reject) => {
                    stream.once('end', resolve)
                    stream.once('error', reject)
                })
                return currentSize
            }

            // offset === 0: STOR (creates/overwrites), offset > 0: APPE
            if (offset === 0) {
                await ftp.uploadFrom(stream, id)
            } else {
                await ftp.appendFrom(stream, id)
            }

            const newOffset = await ftp.size(id)
            await prismaProxy.tusUpload.update({ where: { id }, data: { offset: newOffset } })
            return newOffset
        } finally {
            ftp.close()
        }
    }

    async getUpload(id: string): Promise<Upload> {
        const record = await prismaProxy.tusUpload.findUniqueOrThrow({ where: { id } })
        return new Upload({
            id: record.id,
            offset: record.offset,
            size: record.size ?? undefined,
            metadata: record.metadata as Record<string, string | null> | undefined,
            creation_date: record.createdAt.toISOString(),
            storage: { type: 'ftp', path: record.tempPath },
        })
    }

    async remove(id: string): Promise<void> {
        const record = await prismaProxy.tusUpload.findUnique({ where: { id } })
        if (!record) return

        const ftp = await this.openFtp(record.siteId).catch(() => null)
        if (ftp) {
            try {
                await ftp.ensureDir(this.tempDir)
                await ftp.remove(id)
            } catch {
                // file was already renamed to final path or never created
            } finally {
                ftp.close()
            }
        }

        await prismaProxy.tusUpload.delete({ where: { id } }).catch(() => {})
    }

    async declareUploadLength(id: string, uploadLength: number): Promise<void> {
        await prismaProxy.tusUpload.update({ where: { id }, data: { size: uploadLength } })
    }

    async deleteExpired(): Promise<number> {
        const expired = await prismaProxy.tusUpload.findMany({
            where: { expiresAt: { lte: new Date() } },
        })
        let count = 0
        for (const record of expired) {
            await this.remove(record.id).catch((err: Error) =>
                logger.warn(`[ftp-store] failed to clean expired upload ${record.id}: ${err.message}`)
            )
            count++
        }
        return count
    }

    getExpiration(): number {
        return this.expirationMs
    }
}
