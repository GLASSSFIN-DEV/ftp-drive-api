import { HttpException } from "@/common/http-exception";
import { FtpLibrary } from "@/lib/ftp";
import { IOkResponse } from "@/types/common";
import { Context } from "hono";
import { StatusCodes } from "http-status-codes";
import { IRepositoryFolder, ISource, RepositoryFolder } from "../folder/folder.svc";
import { prismaProxy } from "@/lib/prisma";
import { IRepositoryFile, RepositoryFile } from "../file/file.svc";
import { FileNewDto } from "@/dto/file.dto";
import { notEmpty } from "@/lib/logger";
import { FileInfo } from "basic-ftp";
import { MediaStreamDto } from "@/dto/media.dto";
import { lookup } from "mime-types";
import { Prisma, RecordStatus } from '@/generated/prisma/client'
import { JsonValue } from "@prisma/client/runtime/client";
import { UploadSaga } from "./upload-saga";

interface ISite { [key: string]: { port: number; dir: string; } }
interface IUploadRes { remotePath: string; file: FileInfo; }
interface IFolderUploadRes {
    ftpRes: {
        file: FileInfo;
        workingDir: string;
    };
    fileRecord: {
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
    };
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
        const folderId = c.req.param('folderId')
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
            await ftpLibrary.connect()
            const promise = files.map(async (file) => {
                const buffer = await file.arrayBuffer()
                const res = await ftpLibrary.uploadFile(workingDir, { buffer, fileName: file.name })
                return { res, file }
            })

            const filesUpload = await Promise.all(promise)
            const mapFile = filesUpload.map(async (e) => {
                /* create new-file(s) */
                const fileBody: FileNewDto = {
                    folderId: folder.id,
                    fileName: e.file.name,
                    fileSize: e.file.size,
                    fileType: e.file.type,
                    siteId: site
                }

                return await this.fileRepo.newFile(c, fileBody)
            })

            const res = await Promise.all(mapFile)
            const payload = res.map(e => e.payload).filter(notEmpty)
            return {
                statusCode: 200,
                messages: [],
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

        /* ── validate files ── */
        const rawFiles = body['files']
        const files: File[] = (Array.isArray(rawFiles) ? rawFiles : [rawFiles])
            .filter((f): f is File => !!f && typeof f !== 'string')

        const rawPaths = body['paths[]']
        const relativePaths: string[] = (Array.isArray(rawPaths) ? rawPaths : [rawPaths])
            .filter((p): p is string => typeof p === 'string' && p.length > 0)

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

        /* ── resolve root folder / siteId ── */
        let workingDir = ''
        let rootParentId: string | null = null
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
                rootParentId = folder.id
            }
        }

        /* ── parse each relative path into segments + fileName ── */
        type UploadItem = {
            file: File
            segments: string[]   // folder chain e.g. ["myFolder", "sub"]
            fileName: string
            ftpPath: string     // full remote path for FTP
        }

        const items: UploadItem[] = relativePaths.map((rel, i) => {
            const parts = rel.replace(/\/+/g, '/').replace(/^\//, '').split('/')
            const fileName = parts.pop()!   // last segment = file name
            const segments = parts          // remaining = folder hierarchy
            const ftpPath = `${workingDir}/${rel}`.replace(/\/+/g, '/')
            return { file: files[i], segments, fileName, ftpPath }
        })

        /* ── saga: one instance covers ALL files in this request ── */
        const saga = new UploadSaga()
        const ftpLibrary = new FtpLibrary(siteId)

        try {
            const results = await Promise.all(
                items.map(async ({ file, segments, fileName, ftpPath }) => {

                    // 1. Create fresh DB folder chain → get the leaf folderId
                    const leafFolderId = segments.length > 0
                        ? await this.folderRepo.createFolderChain(segments, rootParentId, account.id, source, saga)
                        : rootParentId ?? (() => {
                            throw new HttpException({
                                errCode: 'NO_ROOT_FOLDER',
                                statusCode: StatusCodes.BAD_REQUEST,
                                messages: ['A folderId is required when files have no subfolder path'],
                            })
                        })()

                    // 2. Upload file over FTP
                    const buffer = await file.arrayBuffer()
                    await ftpLibrary.ensureDir(ftpPath)
                    const ftpRes = await ftpLibrary.uploadFile(ftpPath, { buffer, fileName })
                    saga.track({ type: 'ftp', path: ftpPath, siteId })

                    // 3. Insert File record — always a new row
                    const fileRecord = await prismaProxy.file.create({
                        data: {
                            fileName,
                            folderId: leafFolderId,
                            accountId: account.id,
                            fileSize: file.size,
                            fileType: file.type || 'application/octet-stream',
                            source: source as any,
                            recordStatus: 'ACTIVE',
                        },
                    })

                    saga.track({ type: 'file', id: fileRecord.id })
                    return { ftpRes, fileRecord }
                })
            )

            return { statusCode: 200, messages: [], payload: results }
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
