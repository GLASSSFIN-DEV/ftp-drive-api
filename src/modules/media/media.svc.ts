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

interface IRepositoryMedia {
    fileUpload(c: Context): Promise<IOkResponse>;
    folderUpload(c: Context): Promise<IOkResponse>;
    drop(c: Context): Promise<IOkResponse>;
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
    async fileUpload(c: Context): Promise<IOkResponse> {
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

        const folderPath = await this.folderRepo.queryPath(folder.id)
        const workingDir = `${homePath}/${folderPath}`.replace(/\/+/g, '/')
        const source = folder.source as ISource
        const site = source.ftpPort!

        /* execution */
        const ftpLibrary = new FtpLibrary(Number(site))
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
    }

    /**
     * 
     * @param c 
     */
    folderUpload(c: Context): Promise<IOkResponse> {
        throw new Error("Method not implemented.");
    }

    drop(c: Context): Promise<IOkResponse> {
        throw new Error("Method not implemented.");
    }

}
