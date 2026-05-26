import { Context } from "hono";
import { StatusCodes } from "http-status-codes";
import { FileInfo } from "basic-ftp";
import { lookup } from "mime-types";
import { JsonValue } from "@prisma/client/runtime/client";
import { Readable } from "stream";
import plimit from 'p-limit';
import { Prisma } from "../../generated/prisma/client.js";
import { HttpException } from "../../common/http-exception.js";
import { FileNewDto } from "../../dto/file.dto.js";
import { MediaStreamDto } from "../../dto/media.dto.js";
import { RecordStatus } from "../../generated/prisma/enums.js";
import { FtpLibrary } from "../../lib/ftp.js";
import { notEmpty } from "../../lib/logger.js";
import { prismaProxy } from "../../lib/prisma.js";
import { IOkResponse } from "../../types/common.js";
import { IRepositoryFile, RepositoryFile } from "../file/file.svc.js";
import { IRepositoryFolder, RepositoryFolder, ISource } from "../folder/folder.svc.js";
import { UploadSaga } from "./upload-saga.js";
import { env } from '../../config.js'
import logger from "../../lib/logger.js";

interface ISite { [key: string]: { port: number; dir: string; } }
interface IUploadRes { remotePath: string; }
interface IFolderUploadRes {
    folderId: string;
    id: string;
    createdAt: Date;
    updatedAt: Date | null;
    recordStatus: RecordStatus;
    accountId: string;
    source: JsonValue;
    fileName: string;
    fileHash: string | null;
    fileSize: number;
    fileType: string;
}
interface IRepositoryMedia {
    fileUpload(c: Context): Promise<IOkResponse<IUploadRes[]>>;
    folderUpload(c: Context): Promise<IOkResponse<IFolderUploadRes[]>>;
    stream(c: Context): Promise<Response>;
    site(c: Context): Promise<ISite>;
}

export class RepositoryMedia implements IRepositoryMedia {
    private readonly folderRepo: IRepositoryFolder = new RepositoryFolder()
    private readonly fileRepo: IRepositoryFile = new RepositoryFile()

    constructor() {
        this.folderRepo = new RepositoryFolder()
        this.fileRepo = new RepositoryFile()
    }

    /**
     * 
     * @param c 
     */
    async fileUpload(c: Context): Promise<IOkResponse<IUploadRes[]>> {
        const account = c.get('account')
        const homePath = account.homePath

        const body = await c.req.parseBody({ all: true })
        const rawFiles = body['files']

        /* validate the files */
        const files: File[] = (Array.isArray(rawFiles) ? rawFiles : [rawFiles]).filter(
            (f): f is File => !!f && typeof f !== "string"
        );

        if (files.length === 0) throw new HttpException({
            errCode: 'EMPTY_FILE',
            statusCode: StatusCodes.NOT_FOUND,
            messages: ['No files found!']
        })

        /* validate the folderId */
        const folderId = c.req.param('id')
        const folder = await prismaProxy.folder.findFirst({
            where: { id: folderId },
            select: { id: true, source: true }
        })

        if (!folder) throw new HttpException({
            errCode: 'FOLDER_NOT_FOUND',
            statusCode: StatusCodes.NOT_FOUND,
            messages: ['No folder found!']
        })

        const folderPath = await this.folderRepo.realPath(folder.id)
        const workingDir = `${homePath}/${folderPath}`.replace(/\/+/g, '/')
        const source = folder.source as ISource
        const site = source.ftpPort!

        /* execution */
        const ftpLibrary = new FtpLibrary(Number(site))
        try {
            const limitFtp = plimit(10)
            const promise = files.map(async (file) => limitFtp(async () => {
                await ftpLibrary.connect()
                const buffer = Readable.fromWeb(file.stream() as any)
                const res = await ftpLibrary.uploadFile(workingDir, { buffer, fileName: file.name })
                return { res, file }
            }))

            const filesUpload = await Promise.all(promise)
            const limitDb = plimit(3)
            const mapFile = filesUpload.map(async (e) => limitDb(async () => {
                /* create new-file(s) */
                const fileBody: FileNewDto = {
                    folderId: folder.id,
                    fileName: e.file.name,
                    fileSize: e.file.size,
                    fileType: e.file.type,
                    siteId: site
                }

                return await this.fileRepo.newFile(c, fileBody)
            }))

            const res = await Promise.all(mapFile)
            const payload = res.map(e => e.payload).filter(notEmpty)
            const messages = files.map(e => `Upload file ${e.name} sukses!`)
            return {
                statusCode: 200,
                messages,
                payload
            } satisfies IOkResponse
        } finally {
            ftpLibrary.close()
        }
    }

    /**
     * 
     * @param c 
     * @returns 
     */
    async folderUpload(c: Context): Promise<IOkResponse<IFolderUploadRes[]>> {
        const account = c.get('account')
        const homePath = account.homePath
        const body = await c.req.parseBody({ all: true })

        /* ── resolve root folder / siteId ── */
        let workingDir = ''
        let rootFolder: undefined | { id: string; name: string } = undefined;
        let source!: ISource
        const folderId = c.req.query('folderId')
        let siteId = Number(c.req.query('siteId'))

        if (folderId) {
            const folder = await prismaProxy.folder.findFirst({ where: { id: folderId } })
            if (folder) {
                const folderPath = await this.folderRepo.realPath(folder.id)
                workingDir = `${homePath}/${folderPath}`
                source = folder.source as ISource
                siteId = source.ftpPort!
                rootFolder = { id: folder.id, name: folder.folderName }
            }
        } else {
            workingDir = homePath
            source = {
                ftpHost: env.FTP_HOST,
                ftpPort: siteId,
                remotePath: homePath
            }
        }

        /* ── validate files ── */
        const rawFiles = body['files']
        const files: File[] = (Array.isArray(rawFiles) ? rawFiles : [rawFiles])
            .filter((f): f is File => !!f && typeof f !== 'string')

        const rawPaths = body['paths[]']
        const _relativePaths: string[] = (Array.isArray(rawPaths) ? rawPaths : [rawPaths])
            .filter((p): p is string => typeof p === 'string' && p.length > 0)
        const relativePaths = _relativePaths.map(path => `${workingDir}/${path}`.replace(/\/+$/, ''))

        if (files.length === 0)
            throw new HttpException({
                errCode: 'EMPTY_FILE',
                statusCode: StatusCodes.NOT_FOUND,
                messages: ['No file found!'],
            })

        if (relativePaths.length !== files.length)
            throw new HttpException({
                errCode: 'RELATIVE_PATH_NOT_SYNCUP',
                statusCode: StatusCodes.BAD_REQUEST,
                messages: [`"paths[]" count (${relativePaths.length}) must match "files" count (${files.length})`],
            })

        /* ── parse each relative path into segments + fileName ── */
        type UploadItem = {
            file: File
            segments: string[]   // folder chain e.g. ["myFolder", "sub"]
            fileName: string
            ftpPath: string     // full remote path for FTP
        }

        // Normalize workingDir into clean segments for prefix stripping
        const workingDirSegments = workingDir
            .replace(/\/+/g, '/')
            .replace(/^\/|\/$/g, '')
            .split('/')
            .filter(Boolean)

        const items: UploadItem[] = relativePaths.map((rel, i) => {
            const parts = rel
                .replace(/\/+/g, '/')
                .replace(/^\//, '')
                .split('/')

            const fileName = parts.pop()!
            // Strip the full workingDir prefix instead of just shift()
            // workingDirSegments = ['anonymous_ikwijaya', 'router']
            // parts              = ['anonymous_ikwijaya', 'router', 'types']
            // → segments         = ['types']
            const segments = parts.slice(workingDirSegments.length)
            const ftpPath = `${workingDir}/${segments.join('/')}`.replace(/\/+/g, '/')

            return { file: files[i], segments, fileName, ftpPath }
        })

        /* ── saga: one instance covers ALL files in this request ── */
        const saga = new UploadSaga()
        const ftpLibrary = new FtpLibrary(siteId)

        try {
            const records = []
            for (const { file, segments, fileName, ftpPath } of items) {
                // 1. Create fresh DB folder chain → get the leaf folderId
                await ftpLibrary.connect()
                const leafFolder: { id: string; name: string } = segments.length > 0
                    ? await this.folderRepo.createFolderChain(segments, rootFolder?.id, account.id, source, saga)
                    : rootFolder ?? (() => {
                        throw new HttpException({
                            errCode: 'NO_ROOT_FOLDER',
                            statusCode: StatusCodes.BAD_REQUEST,
                            messages: ['A folderId is required when files have no subfolder path'],
                        })
                    })()

                logger.http(`[leaf]`, { fileName, segments, ftpPath, leafFolder })

                // 3. Upload new FTP file
                const buffer = Readable.fromWeb(file.stream() as any)
                await ftpLibrary.uploadFile(ftpPath, { buffer, fileName })
                saga.track({ type: 'ftp', path: ftpPath, siteId })

                // 4. Find unique file-folder
                const existingFile = await prismaProxy.file.findUnique({
                    where: {
                        folderId_fileName: {
                            folderId: leafFolder.id,
                            fileName,
                        },
                    },
                })

                const fileRecord = await prismaProxy.file.upsert({
                    where: {
                        folderId_fileName: {
                            folderId: leafFolder.id,
                            fileName,
                        },
                    },
                    create: {
                        fileName,
                        folderId: leafFolder.id,
                        accountId: account.id,
                        fileSize: file.size,
                        fileType: file.type,
                        source: source as any,
                        recordStatus: 'ACTIVE',
                    },
                    update: {
                        fileSize: file.size,
                        fileType: file.type,
                        updatedAt: new Date(),
                    },
                })

                records.push(fileRecord)
                // ONLY track newly created rows
                if (!existingFile) {
                    saga.track({
                        type: 'file',
                        id: fileRecord.id,
                    })
                }
            }

            const messages = files.map(e => `Upload file ${e.name} sukses!`)
            return { statusCode: 200, messages, payload: records }
        } catch (error) {
            await saga.rollback(ftpLibrary)
            throw error
        } finally {
            ftpLibrary.close()
        }
    }

    /**
     * 
     * @param c 
     * @returns 
     */
    async stream(c: Context): Promise<Response> {
        const body = c.get('validatedBody') as MediaStreamDto
        const ftpLibrary = new FtpLibrary()

        try {
            await ftpLibrary.connect()
            const res = await ftpLibrary.streamFile(body.remotePath, body.fileName)
            const mimeType = lookup(body.fileName)
            const headers: Record<string, string> = {
                "Content-Type": mimeType as string ?? 'application/octet-stream',
                "Content-Disposition": `inline; filename="${body.fileName}"`,
                "Cache-Control": "no-store",
            }

            return new Response(res.stream, { status: StatusCodes.OK, headers })
        } finally {
            ftpLibrary.close()
        }
    }

    /**
     * 
     * @param c 
     * @returns 
     */
    async site(c: Context): Promise<ISite> {
        const site = await prismaProxy.option.findFirst({
            select: { key: true, json: true },
            where: {
                key: 'ftp-site',
                json: { not: Prisma.AnyNull }
            }
        })

        if (!site) throw new HttpException({
            errCode: 'NOT_FOUND',
            statusCode: StatusCodes.NOT_FOUND,
            messages: ['No site registered!']
        })

        const value: ISite = site?.json as ISite
        return value
    }
}
