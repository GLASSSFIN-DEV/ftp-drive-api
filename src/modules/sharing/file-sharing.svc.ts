import { Context } from "hono";
import { StatusCodes } from "http-status-codes";
import { v7 } from 'uuid';
import { SharePermission } from "../../generated/prisma/enums.js";
import { HttpException } from "../../common/http-exception.js";
import { FileSharingNewDto } from "../../dto/file-share.dto.js";
import { FtpLibrary } from "../../lib/ftp.js";
import { prismaProxy } from "../../lib/prisma.js";
import { IOkResponse } from "../../types/common.js";
import { IRepositoryFolder, RepositoryFolder, ISource } from "../folder/folder.svc.js";

interface IFileSharingObj {
    account: {
        username: string;
        fullname: string | null;
    };
    file: {
        folder: {
            folderName: string;
        };
        folderId: string;
        fileName: string;
    };
    id: string;
    toAccountId: string;
    permission: SharePermission;
    fileId: string;
}

export interface IRepositoryFileSharing {
    fileSharingNew(c: Context): Promise<IOkResponse>;
    fileSharingDrop(c: Context): Promise<IOkResponse>;
    get(c: Context): Promise<IFileSharingObj | null>;
}

export class RepositoryFileSharing implements IRepositoryFileSharing {
    private readonly folderRepo: IRepositoryFolder = new RepositoryFolder()

    constructor() {
        this.folderRepo = new RepositoryFolder()
    }

    /**
     * 
     * @param c 
     */
    async fileSharingNew(c: Context): Promise<IOkResponse> {
        const body = c.get('validatedBody') as FileSharingNewDto
        const account = c.get('account')

        const findFile = await prismaProxy.file.findFirst({ where: { id: body.fileId, accountId: account.id } })
        const findAccount = await prismaProxy.account.findFirst({ where: { id: body.toAccountId } })
        const exist = await prismaProxy.fileSharing.findFirst({ where: { fileId: body.fileId, toAccountId: body.toAccountId } })

        if (exist && exist.permission === body.permission) throw new HttpException({
            errCode: 'SHARE_NOT_IMPLEMENTED',
            statusCode: StatusCodes.NOT_IMPLEMENTED,
            messages: ['Already sharing with permission ', body.permission]
        })

        if (!findFile)
            throw new HttpException({
                errCode: 'NOT_FOUND',
                statusCode: StatusCodes.NOT_FOUND,
                messages: ['File not found!']
            })

        if (!findAccount)
            throw new HttpException({
                errCode: 'ACCOUNT_NOT_FOUND',
                statusCode: StatusCodes.NOT_FOUND,
                messages: ['User not found!']
            })

        const source = findFile.source as unknown as ISource
        if (!source?.ftpPort) throw new HttpException({
            errCode: 'SOURCE_NOT_FOUND',
            statusCode: StatusCodes.NOT_FOUND,
            messages: ['Your folder source not defined!']
        })

        const link = `code=${v7()}`
        await prismaProxy.$transaction(async (tx) => {
            await tx.fileSharing.create({
                data: {
                    fileId: body.fileId,
                    toAccountId: body.toAccountId,
                    permission: body.permission,
                    expiredAt: body.expiredAt,
                    generatedLink: link,
                    accountId: account.id
                }
            })

            if (exist) await tx.fileSharing.delete({ where: { id: exist.id } })
        })

        return {
            statusCode: StatusCodes.CREATED,
            messages: ['Sharing created!'],
            payload: { link }
        }
    }

    /**
     * 
     * @param c 
     */
    async fileSharingDrop(c: Context): Promise<IOkResponse> {
        const account = c.get('account')
        const id = c.req.param('id')

        const exist = await prismaProxy.fileSharing.findFirst({ where: { id, accountId: account.id } })
        if (!exist) throw new HttpException({
            errCode: 'SHARING_DENIED',
            statusCode: StatusCodes.NOT_IMPLEMENTED,
            messages: ['You don`t have permission for this File Sharing']
        })

        await prismaProxy.$transaction(async (tx) => {
            await tx.fileSharing.delete({ where: { id: exist.id } })
        })

        return {
            statusCode: StatusCodes.OK,
            messages: ['File sharing deleted!'],
        }
    }

    /**
     * 
     * @param c 
     */
    async get(c: Context): Promise<IFileSharingObj | null> {
        const account = c.get('account')
        const id = c.req.param('id')
        const item: IFileSharingObj | null = await prismaProxy.fileSharing.findFirst({
            where: { id, accountId: account.id },
            select: {
                id: true,
                fileId: true,
                permission: true,
                file: {
                    select: {
                        fileName: true,
                        folderId: true,
                        folder: {
                            select: {
                                folderName: true
                            }
                        }
                    }
                },
                toAccountId: true,
                account: {
                    select: {
                        username: true,
                        fullname: true,
                    }
                }
            }
        })

        return item
    }

}