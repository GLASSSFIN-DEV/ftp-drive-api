import { HttpException } from "@/common/http-exception";
import { FolderChangeDto, FolderNewDto } from "@/dto/folder.dto";
import { FtpLibrary, type IFtpLibrary } from "@/lib/ftp";
import prismaProxy from "@/lib/prisma";
import { IItemPagination, IOkResponse } from "@/types/common";
import { InputJsonObject, JsonValue } from "@prisma/client/runtime/client";
import { Context } from "hono";
import { env } from '@/config';
import { Folder } from "@/generated/prisma/client";
import { StatusCodes } from "http-status-codes";
import createPagination from "@/common/pagination";
import { FolderWhereInput } from "@/generated/prisma/models";

interface IFolderObj {
    account: {
        username: string;
        fullname: string | null;
    };
    id: string;
    parentId: string | null;
    accountId: string;
    folderName: string;
    source: JsonValue;
    createdAt: Date;
    updatedAt: Date | null;
    parent: {
        folderName: string;
    } | null;
    folders: {
        folderName: string;
        _count: {
            folders: number;
        };
    }[];
}[]

interface IFolderSource { ftpHost: string; ftpPort: number; remotePath?: string; oldPath?: string; }
export interface IRepositoryFolder {
    newFolder(c: Context): Promise<IOkResponse | HttpException>;
    changeFolder(c: Context): Promise<IOkResponse | HttpException>;
    removeFolder(c: Context): Promise<IOkResponse | HttpException>;
    lists(c: Context): Promise<IItemPagination<IFolderObj[]> | HttpException>;
    get(c: Context): Promise<IOkResponse<IFolderObj | null> | HttpException>;
    qPath(folderId: string): Promise<string>;
}

export class RepositoryFolder implements IRepositoryFolder {
    private readonly ftp: IFtpLibrary = new FtpLibrary()
    private readonly ftpPort: number = 990

    constructor(ftpPort: number = 990) {
        this.ftp = new FtpLibrary(ftpPort)
        this.ftpPort = ftpPort;
    }

    /**
     * 
     * @param folderId 
     * @returns 
     */
    public async qPath(folderId: string): Promise<string> {
        const folders = await prismaProxy.folder.findMany()
        const map = new Map<string, Folder>()

        for (const folder of folders) {
            map.set(folder.id, folder)
        }

        const buildPath = (id: string): string => {
            const folder = map.get(id)
            if (!folder) return '/'
            if (!folder.parentId) return `/${folder.folderName}`

            const parentPath = buildPath(folder.parentId)
            return parentPath ? `${parentPath}/${folder.folderName}` : `/${folder.folderName}`
        }

        return buildPath(folderId)
    }

    /**
     * 
     * @param c 
     * @returns 
     */
    async newFolder(c: Context): Promise<IOkResponse | HttpException> {
        const account = c.get('account')
        const obj: FolderNewDto = c.get('validatedBody') as FolderNewDto
        const parent = await prismaProxy.folder.findFirst({ where: { id: obj.parentId } })

        if (!parent) throw new HttpException({
            errCode: 'PARENT_NOT_FOUND',
            statusCode: StatusCodes.NOT_FOUND,
            messages: ['Your parent folder doesn`t exists!']
        })

        const exist = await prismaProxy.folder.findFirst({ where: { folderName: obj.folderName, parentId: obj.parentId } })
        if (exist) throw new HttpException({
            errCode: 'FOLDER_EXISTS',
            statusCode: StatusCodes.CONFLICT,
            messages: ['Folder name already exist!']
        })

        const remotePath = await this.qPath(parent.id)
        await this.ftp.folderExist(remotePath)

        const finalPath = (remotePath + '/' + obj.folderName).replace(/\/+/g, '/')
        await prismaProxy.$transaction(async (tx) => {
            const source: IFolderSource = {
                ftpHost: env.FTP_HOST,
                ftpPort: this.ftpPort,
                remotePath: finalPath
            }

            await tx.folder.create({
                data: {
                    folderName: obj.folderName,
                    parentId: obj.parentId,
                    source: source as unknown as InputJsonObject,
                    accountId: account.id
                }
            })
        })

        await this.ftp.folderExist(finalPath)
        return {
            statusCode: StatusCodes.CREATED,
            messages: ['Create Success'],
            payload: { remotePath: finalPath }
        } satisfies IOkResponse
    }

    /**
     * 
     * @param c 
     * @returns 
     */
    async changeFolder(c: Context): Promise<IOkResponse | HttpException> {
        const account = c.get('account')
        const obj: FolderChangeDto = c.get('validatedBody') as FolderChangeDto
        const id = c.req.param('id') as string
        const exist = await prismaProxy.folder.findFirst({ where: { id } })

        if (!exist) throw new HttpException({
            errCode: 'FOLDER_NOT_FOUND',
            statusCode: StatusCodes.NOT_FOUND,
            messages: ['Your folder doesn`t exists!']
        })

        const parent = await prismaProxy.folder.findFirst({ where: { id: obj.parentId } })
        if (!parent) throw new HttpException({
            errCode: 'PARENT_NOT_FOUND',
            statusCode: StatusCodes.NOT_FOUND,
            messages: ['Your parent folder doesn`t exists!']
        })

        const nameExist = await prismaProxy.folder.findFirst({ where: { folderName: obj.folderName, parentId: obj.parentId, id: { not: id } } })
        if (nameExist) throw new HttpException({
            errCode: 'FOLDER_EXISTS',
            statusCode: StatusCodes.CONFLICT,
            messages: ['Folder name already exist!']
        })

        const oldPath = await this.qPath(parent.id)
        const newPath = (oldPath + '/' + obj.folderName).replace(/\/+/g, '/')
        await this.ftp.folderExist(oldPath)

        await prismaProxy.$transaction(async (tx) => {
            const source: IFolderSource = {
                ftpHost: env.FTP_HOST,
                ftpPort: this.ftpPort,
                remotePath: newPath,
                oldPath,
            }

            await tx.folder.update({
                data: {
                    folderName: obj.folderName,
                    parentId: obj.parentId,
                    source: source as unknown as InputJsonObject,
                    accountId: account.id,
                    updatedAt: new Date()
                },
                where: { id }
            })
        })


        await this.ftp.folderExist(newPath)
        return {
            statusCode: StatusCodes.CREATED,
            messages: ['Change Success'],
            payload: { oldPath, newPath }
        } satisfies IOkResponse
    }

    /**
     * 
     * @param c 
     */
    async removeFolder(c: Context): Promise<IOkResponse | HttpException> {
        const id = c.req.param('id') as string
        const exist = await prismaProxy.folder.findFirst({ where: { id } })

        if (!exist) throw new HttpException({
            errCode: 'FOLDER_NOT_FOUND',
            statusCode: StatusCodes.NOT_FOUND,
            messages: ['Your folder doesn`t exists!']
        })

        const fileIds = await prismaProxy.file.findMany({ where: { folderId: id } })
        await prismaProxy.$transaction(async (tx) => {
            await tx.fileSharing.deleteMany({ where: { fileId: { in: fileIds.map(e => e.id) } } })
            await tx.folderSharing.deleteMany({ where: { folderId: id } })
            await tx.file.deleteMany({ where: { folderId: id } })
            await tx.folder.delete({ where: { id } })
        })

        return {
            statusCode: StatusCodes.OK,
            messages: ['Remove Success'],
            payload: {
                folder: exist,
                files: fileIds,
            }
        } satisfies IOkResponse
    }

    /**
     * 
     * @param c 
     */
    async lists(c: Context): Promise<IItemPagination<IFolderObj[]> | HttpException> {
        const account = c.get('account')
        const { page, pageSize, keyword, startDate, endDate } = c.req.query()
        const where: FolderWhereInput = {
            accountId: account.id,
            folderName: { contains: keyword, mode: 'insensitive' },
            createdAt: {
                gte: startDate ? new Date(startDate) : undefined,
                lt: endDate ? new Date(endDate) : undefined,
            },
        }

        const totalRows = await prismaProxy.folder.count({ where })
        if (totalRows === 0) return {
            items: [],
            rbac: account.rbac,
            pagination: {
                page: Number(page),
                pageSize: Number(pageSize)
            }
        } satisfies IItemPagination

        const pagination = createPagination(Number(page), Number(pageSize), totalRows);
        const items = await prismaProxy.folder.findMany({
            where,
            take: pagination.take,
            skip: pagination.skip,
            select: {
                id: true,
                folderName: true,
                createdAt: true,
                updatedAt: true,
                source: true,
                accountId: true,
                account: {
                    select: {
                        fullname: true,
                        username: true
                    }
                },
                parentId: true,
                parent: {
                    select: {
                        folderName: true
                    }
                },
                folders: {
                    select: {
                        _count: {
                            select: {
                                folders: true
                            }
                        },
                        folderName: true,
                    }
                }
            }
        })

        return {
            items,
            pagination,
            rbac: account.rbac
        } satisfies IItemPagination
    }

    /**
     * 
     * @param c 
     */
    async get(c: Context): Promise<IOkResponse<IFolderObj | null> | HttpException> {
        const id = c.req.param('id')
        const item = await prismaProxy.folder.findFirst({
            where: { id },
            select: {
                id: true,
                folderName: true,
                createdAt: true,
                updatedAt: true,
                source: true,
                accountId: true,
                account: {
                    select: {
                        fullname: true,
                        username: true
                    }
                },
                parentId: true,
                parent: {
                    select: {
                        folderName: true
                    }
                },
                folders: {
                    select: {
                        _count: {
                            select: {
                                folders: true
                            }
                        },
                        folderName: true,
                    }
                }
            }
        })

        return {
            messages: ['Success'],
            statusCode: StatusCodes.OK,
            payload: item
        } satisfies IOkResponse
    }
}