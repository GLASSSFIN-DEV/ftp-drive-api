import { HttpException } from "@/common/http-exception";
import { FolderSharingNewDto } from "@/dto/folder-share.dto";
import { SharePermission } from "@/generated/prisma/enums";
import { IFtpLibrary, FtpLibrary } from "@/lib/ftp";
import { prismaProxy } from "@/lib/prisma";
import { IOkResponse } from "@/types/common";
import { Context } from "hono";
import { StatusCodes } from "http-status-codes";
import { v7 } from 'uuid';
import { IRepositoryFolder, ISource, RepositoryFolder } from "../folder/folder.svc";

interface IFolderSharingObj {
    account: {
        username: string;
        fullname: string | null;
    };
    folder: {
        folderName: string;
        files: {
            fileName: string;
        }[];
    };
    id: string;
    folderId: string;
    toAccountId: string;
    permission: SharePermission;
}

export interface IRepositoryFolderSharing {
    folderSharingNew(c: Context): Promise<IOkResponse>;
    folderSharingDrop(c: Context): Promise<IOkResponse>;
    get(c: Context): Promise<IOkResponse<IFolderSharingObj | null>>;
}

export class RepositoryFolderSharing implements IRepositoryFolderSharing {
    private readonly folderRepo: IRepositoryFolder = new RepositoryFolder()

    constructor() {
        this.folderRepo = new RepositoryFolder()
    }

    /**
     * 
     * @param c 
     */
    async folderSharingNew(c: Context): Promise<IOkResponse> {
        const body = c.get('validatedBody') as FolderSharingNewDto
        const account = c.get('account')

        const findFolder = await prismaProxy.folder.findFirst({ where: { id: body.folderId, accountId: account.id } })
        const findAccount = await prismaProxy.account.findFirst({ where: { id: body.toAccountId } })
        const exist = await prismaProxy.folderSharing.findFirst({ where: { fileId: body.folderId, toAccountId: body.toAccountId } })

        if (exist && exist.permission === body.permission) throw new HttpException({
            errCode: 'SHARE_NOT_IMPLEMENTED',
            statusCode: StatusCodes.NOT_IMPLEMENTED,
            messages: ['Already sharing with permission ', body.permission]
        })

        if (!findFolder)
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

        const source = findFolder.source as unknown as ISource
        if (!source?.ftpPort) throw new HttpException({
            errCode: 'SOURCE_NOT_FOUND',
            statusCode: StatusCodes.NOT_FOUND,
            messages: ['Your folder source not defined!']
        })

        const ftp = new FtpLibrary(source.ftpPort)
        const link = `code=${v7()}`
        const remotePath = await this.folderRepo.realPath(findFolder.id)

        await ftp.ensureDir(remotePath)
        await prismaProxy.$transaction(async (tx) => {
            await tx.folderSharing.create({
                data: {
                    folderId: body.folderId,
                    toAccountId: body.toAccountId,
                    permission: body.permission,
                    expiredAt: body.expiredAt,
                    generatedLink: link,
                    accountId: account.id
                }
            })

            if (exist) await tx.folderSharing.delete({ where: { id: exist.id } })
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
    async folderSharingDrop(c: Context): Promise<IOkResponse> {
        const account = c.get('account')
        const id = c.req.param('id')

        const exist = await prismaProxy.folderSharing.findFirst({ where: { id, accountId: account.id } })
        if (!exist) throw new HttpException({
            errCode: 'SHARING_DENIED',
            statusCode: StatusCodes.NOT_IMPLEMENTED,
            messages: ['You don`t have permission for this Folder Sharing']
        })

        await prismaProxy.$transaction(async (tx) => {
            await tx.folderSharing.delete({ where: { id: exist.id } })
        })

        return {
            statusCode: StatusCodes.OK,
            messages: ['Folder sharing deleted!'],
        }
    }

    /**
     * 
     * @param c 
     */
    async get(c: Context): Promise<IOkResponse<IFolderSharingObj | null>> {
        const account = c.get('account')
        const id = c.req.param('id')
        const item: IFolderSharingObj | null = await prismaProxy.folderSharing.findFirst({
            where: { id, accountId: account.id },
            select: {
                id: true,
                folderId: true,
                permission: true,
                folder: {
                    select: {
                        folderName: true,
                        files: {
                            select: {
                                fileName: true
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

        return {
            statusCode: StatusCodes.OK,
            messages: [],
            payload: item
        }
    }

}