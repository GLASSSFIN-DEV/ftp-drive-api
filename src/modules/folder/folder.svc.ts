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
    action?: {
        isUpdate: boolean;
        isDelete: boolean;
        isSharing: boolean;
    },
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
    fileSharings: {
        account: {
            username: string;
            fullname: string | null;
        };
        id: string;
    }[];
}[]

interface IFolderSource { ftpHost: string; ftpPort: number; remotePath?: string; oldPath?: string; }
export interface IRepositoryFolder {
    newFolder(c: Context): Promise<IOkResponse>;
    changeFolder(c: Context): Promise<IOkResponse>;
    removeFolder(c: Context): Promise<IOkResponse>;
    lists(c: Context): Promise<IItemPagination<IFolderObj[]>>;
    get(c: Context): Promise<IOkResponse<IFolderObj | null>>;
    queryPath(folderId: string): Promise<string>;
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
    public async queryPath(folderId: string): Promise<string> {
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
    async newFolder(c: Context): Promise<IOkResponse> {
        const account = c.get('account')
        const obj: FolderNewDto = c.get('validatedBody') as FolderNewDto
        const parent = await prismaProxy.folder.findFirst({ where: { id: obj.parentId, accountId: account.id } })

        if (!parent) throw new HttpException({
            errCode: 'PARENT_NOT_FOUND',
            statusCode: StatusCodes.NOT_FOUND,
            messages: ['Your parent folder doesn`t exists!']
        })

        const exist = await prismaProxy.folder.findFirst({ where: { accountId: account.id, folderName: obj.folderName, parentId: obj.parentId } })
        if (exist) throw new HttpException({
            errCode: 'FOLDER_EXISTS',
            statusCode: StatusCodes.CONFLICT,
            messages: ['Folder name already exist!']
        })

        const remotePath = await this.queryPath(parent.id)
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
                    accountId: account.id,
                    recordStatus: 'ACTIVE'
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
    async changeFolder(c: Context): Promise<IOkResponse> {
        const account = c.get('account')
        const obj: FolderChangeDto = c.get('validatedBody') as FolderChangeDto
        const id = c.req.param('id') as string
        const exist = await prismaProxy.folder.findFirst({ where: { id, accountId: account.id } })

        if (!exist) throw new HttpException({
            errCode: 'FOLDER_NOT_FOUND',
            statusCode: StatusCodes.NOT_FOUND,
            messages: ['Your folder doesn`t exists!']
        })

        const parent = await prismaProxy.folder.findFirst({ where: { id: obj.parentId, accountId: account.id } })
        if (!parent) throw new HttpException({
            errCode: 'PARENT_NOT_FOUND',
            statusCode: StatusCodes.NOT_FOUND,
            messages: ['Your parent folder doesn`t exists!']
        })

        const nameExist = await prismaProxy.folder.findFirst({ where: { accountId: account.id, folderName: obj.folderName, parentId: obj.parentId, id: { not: id } } })
        if (nameExist) throw new HttpException({
            errCode: 'FOLDER_EXIST',
            statusCode: StatusCodes.CONFLICT,
            messages: ['Folder name already exist!']
        })

        const oldPath = await this.queryPath(parent.id)
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
                where: { id, accountId: account.id }
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
    async removeFolder(c: Context): Promise<IOkResponse> {
        const account = c.get('account')
        const id = c.req.param('id') as string
        const exist = await prismaProxy.folder.findFirst({ where: { id, accountId: account.id } })

        if (!exist) throw new HttpException({
            errCode: 'FOLDER_NOT_FOUND',
            statusCode: StatusCodes.NOT_FOUND,
            messages: ['Your folder doesn`t exists!']
        })

        const fileIds = await prismaProxy.file.findMany({ where: { folderId: id } })
        await prismaProxy.$transaction(async (tx) => {
            await tx.fileSharing.deleteMany({ where: { fileId: { in: fileIds.map(e => e.id) }, accountId: account.id } })
            await tx.folderSharing.deleteMany({ where: { folderId: id, accountId: account.id } })
            await tx.file.deleteMany({ where: { folderId: id, accountId: account.id } })
            await tx.folder.delete({ where: { id, accountId: account.id } })
        })

        const remotePath = await this.queryPath(id)
        await this.ftp.removeDir(remotePath)

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
    async lists(c: Context): Promise<IItemPagination<IFolderObj[]>> {
        const account = c.get('account')
        const { page, pageSize, keyword, startDate, endDate, accountId } = c.req.query()
        const where: FolderWhereInput = {
            folderName: { contains: keyword, mode: 'insensitive' },
            createdAt: {
                gte: startDate ? new Date(startDate) : undefined,
                lt: endDate ? new Date(endDate) : undefined,
            },
        }

        if (accountId) where.accountId = accountId
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
        const items: IFolderObj[] = await prismaProxy.folder.findMany({
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
                },
                fileSharings: {
                    select: {
                        id: true,
                        account: {
                            select: {
                                username: true,
                                fullname: true,
                            }
                        }
                    }
                }
            }
        })

        return {
            items: items.map(e => ({
                ...e,
                action: {
                    isUpdate: account && account.id === e.accountId,
                    isDelete: account && account.id === e.accountId,
                    isSharing: account && account.id === e.accountId,
                }
            })),
            pagination,
            rbac: account.rbac
        }
    }

    /**
     * 
     * @param c 
     */
    async get(c: Context): Promise<IOkResponse<IFolderObj | null>> {
        const account = c.get('account')
        const id = c.req.param('id')
        const item: IFolderObj | null = await prismaProxy.folder.findFirst({
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
                },
                fileSharings: {
                    select: {
                        id: true,
                        account: {
                            select: {
                                username: true,
                                fullname: true,
                            }
                        }
                    }
                }
            }
        })

        return {
            messages: ['Success'],
            statusCode: StatusCodes.OK,
            payload: item ? {
                ...item,
                action: {
                    isUpdate: account && account.id === item.accountId,
                    isDelete: account && account.id === item.accountId,
                    isSharing: account && account.id === item.accountId,
                }
            } : null
        }
    }
}