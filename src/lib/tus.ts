import { Server as TusServer } from '@tus/server'
import { FileStore } from '@tus/file-store'
import { createReadStream } from 'node:fs'
import { unlink } from 'node:fs/promises'
import path from 'node:path'
import { verify } from 'hono/jwt'
import type { JWTPayload } from 'hono/utils/jwt/types'
import { lookup } from 'mime-types'
import { env } from '../config.js'
import { prismaProxy } from './prisma.js'
import { FtpLibrary } from './ftp.js'
import logger from './logger.js'
import { homePath } from '../middleware/auth.validator.js'
import { RepositoryFolder } from '../modules/folder/folder.svc.js'

const TUS_UPLOAD_DIR = process.env.TUS_UPLOAD_DIR ?? './tus-temp'
const folderRepo = new RepositoryFolder()

interface CachedAccount {
    id: string
    username: string
    homePath: string
}
const uploadAccounts = new Map<string, CachedAccount>()

// req here is a Fetch-API Request (from @tus/server v2 / srvx)
async function validateBearer(req: Request): Promise<CachedAccount> {
    const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/, '')
    if (!token) throw { status_code: 401, body: 'Unauthorized' }

    const payload = await verify(token, env.JWT_SECRET, { alg: 'HS256' })
        .catch(() => { throw { status_code: 401, body: 'Invalid token' } }) as JWTPayload & { sub: string }

    const session = await prismaProxy.session.findFirst({
        where: { accountId: payload.sub, jwtHash: token, recordStatus: 'ACTIVE' },
    })
    if (!session) throw { status_code: 401, body: 'Session expired' }

    const user = await prismaProxy.account.findFirst({
        select: { id: true, username: true },
        where: { id: payload.sub, recordStatus: 'ACTIVE' },
    })
    if (!user) throw { status_code: 401, body: 'User not found' }

    return { id: user.id, username: user.username, homePath: homePath(user.username) }
}

export const tusServer = new TusServer({
    path: '/v1/upload/tus',
    datastore: new FileStore({ directory: TUS_UPLOAD_DIR }),

    onUploadCreate: async (req, upload) => {
        const account = await validateBearer(req as unknown as Request)
        uploadAccounts.set(upload.id, account)

        const folderId = upload.metadata?.folderId
        if (!folderId) throw { status_code: 400, body: 'Missing required metadata: folderId' }

        const folder = await prismaProxy.folder.findFirst({ where: { id: folderId } })
        if (!folder) throw { status_code: 400, body: 'Folder not found' }

        return {}
    },

    onUploadFinish: async (req, upload) => {
        const account = uploadAccounts.get(upload.id)
        if (!account) throw { status_code: 401, body: 'Upload session expired' }
        uploadAccounts.delete(upload.id)

        const { fileName, folderId, siteId, fileType } = upload.metadata ?? {}

        if (!fileName || !siteId || !folderId) {
            throw { status_code: 400, body: 'Missing required metadata: fileName, siteId, folderId' }
        }

        const tempFilePath = path.join(TUS_UPLOAD_DIR, upload.id)
        const mimeType = fileType || lookup(fileName) || 'application/octet-stream'
        const fileSize = upload.size ?? 0

        // Compute FTP destination from folderId
        const folderPath = await folderRepo.realPath(folderId)
        const workingDir = `${account.homePath}/${folderPath}`.replace(/\/+/g, '/')

        // FTP upload
        const ftpLib = new FtpLibrary(Number(siteId))
        try {
            await ftpLib.connect()
            await ftpLib.uploadFile(workingDir, {
                buffer: createReadStream(tempFilePath),
                fileName,
            })
            logger.info(`[tus] FTP upload done: ${workingDir}/${fileName}`)
        } finally {
            ftpLib.close()
        }

        // Persist file record
        try {
            await prismaProxy.file.upsert({
                where: { folderId_fileName: { folderId, fileName } },
                create: {
                    fileName,
                    folderId,
                    accountId: account.id,
                    fileSize,
                    fileType: mimeType,
                    source: {
                        ftpHost: env.FTP_HOST,
                        ftpPort: Number(siteId),
                        remotePath: workingDir,
                    } as any,
                    recordStatus: 'ACTIVE',
                },
                update: {
                    fileSize,
                    fileType: mimeType,
                    updatedAt: new Date(),
                },
            })
        } catch (dbErr) {
            logger.error('[tus] DB upsert failed', dbErr)
        }

        // Cleanup temp chunk file
        await unlink(tempFilePath).catch((e) =>
            logger.warn(`[tus] cleanup failed for ${upload.id}: ${e.message}`)
        )

        return {}
    },
})
