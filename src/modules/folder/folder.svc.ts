import { HttpException } from "@/common/http-exception";
import { FolderChangeDto, FolderNewDto } from "@/dto/folder.dto";
import { FtpLibrary } from "@/lib/ftp";
import { prismaProxy } from "@/lib/prisma";
import { IItemPagination, IOkResponse } from "@/types/common";
import { InputJsonObject, JsonValue } from "@prisma/client/runtime/client";
import { Context } from "hono";
import { env } from '@/config';
import { Folder } from "@/generated/prisma/client";
import { StatusCodes } from "http-status-codes";
import createPagination, { createOrderBy } from "@/common/pagination";
import { FolderWhereInput } from "@/generated/prisma/models";
import { FTPResponse } from "basic-ftp";

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
}

export interface ISource { 
    [key: string]: string | number | undefined | FTPResponse
    ftpHost: string; 
    ftpPort: number; 
    remotePath?: string; 
    oldPath?: string; 
}

export interface IRepositoryFolder {
    newFolder(c: Context): Promise<IOkResponse>;
    changeFolder(c: Context): Promise<IOkResponse>;
    removeFolder(c: Context): Promise<IOkResponse>;
    lists(c: Context): Promise<IItemPagination<IFolderObj[]>>;
    get(c: Context): Promise<Object | null>;
    queryPath(folderId: string): Promise<string>;
    myFolders(c: Context): Promise<Object[]>;
}

export class RepositoryFolder implements IRepositoryFolder {
    constructor() { }

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
        const homePath = account.homePath
        const obj: FolderNewDto = c.get('validatedBody') as FolderNewDto
        const parent = await prismaProxy.folder.findFirst({ where: { id: obj.parentId, accountId: account.id } })

        if (obj.parentId && !parent) throw new HttpException({
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

        let parentPath = ''
        const ftp = new FtpLibrary(obj.siteId)
        if (obj.parentId) parentPath = await this.queryPath(obj.parentId)

        const workingDir = `${homePath}/${parentPath}`
        await ftp.folderExist(workingDir)

        const finalPath = (workingDir + '/' + obj.folderName).replace(/\/+/g, '/')
        await prismaProxy.$transaction(async (tx) => {
            const source: ISource = {
                ftpHost: env.FTP_HOST,
                ftpPort: obj.siteId,
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

        await ftp.folderExist(finalPath)
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
        const homePath = account.homePath
        const obj: FolderChangeDto = c.get('validatedBody') as FolderChangeDto
        const id = c.req.param('id') as string
        const exist = await prismaProxy.folder.findFirst({ where: { id, accountId: account.id } })

        if (!exist) throw new HttpException({
            errCode: 'FOLDER_NOT_FOUND',
            statusCode: StatusCodes.NOT_FOUND,
            messages: ['Your folder doesn`t exists!']
        })

        const parent = await prismaProxy.folder.findFirst({ where: { id: obj.parentId, accountId: account.id } })
        if (obj.parentId && !parent) throw new HttpException({
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

        const ftp = new FtpLibrary(obj.siteId)
        const currentDir = await this.queryPath(exist.id)
        const lastWorkDir = `${homePath}/${currentDir}`
        await ftp.folderExist(lastWorkDir)

        // if new parent <> last parent
        let parentPath = ''
        if (obj.parentId && obj.parentId !== exist.parentId) {
            parentPath = await this.queryPath(obj.parentId)
            await ftp.folderExist(`${homePath}/${parentPath}`)
        }

        // if new folderName <> last folderName
        let newWorkDir = ''
        if (obj.folderName !== exist.folderName) {
            newWorkDir = `${homePath}/${parentPath}/${obj.folderName}`
            await ftp.folderExist(newWorkDir.replace(/\/+/g, '/'))
        }

        await ftp.folderExist(newWorkDir)
        await prismaProxy.$transaction(async (tx) => {
            const source: ISource = {
                ftpHost: env.FTP_HOST,
                ftpPort: obj.siteId,
                remotePath: newWorkDir,
                lastWorkDir,
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

        await ftp.rename(lastWorkDir, newWorkDir)
        return {
            statusCode: StatusCodes.CREATED,
            messages: ['Change Success'],
            payload: { lastWorkDir, newWorkDir }
        } satisfies IOkResponse
    }

    /**
     * 
     * @param c 
     */
    async removeFolder(c: Context): Promise<IOkResponse> {
        const account = c.get('account')
        const homePath = account.homePath
        const id = c.req.param('id') as string
        const exist = await prismaProxy.folder.findFirst({ where: { id, accountId: account.id } })

        if (!exist) throw new HttpException({
            errCode: 'FOLDER_NOT_FOUND',
            statusCode: StatusCodes.NOT_FOUND,
            messages: ['Your folder doesn`t exists!']
        })

        const source = exist.source as unknown as ISource
        if (!source?.ftpPort) throw new HttpException({
            errCode: 'SOURCE_NOT_FOUND',
            statusCode: StatusCodes.NOT_FOUND,
            messages: ['Your folder source not defined!']
        })

        const fileIds = await prismaProxy.file.findMany({ where: { folderId: id } })
        await prismaProxy.$transaction(async (tx) => {
            await tx.fileSharing.deleteMany({ where: { fileId: { in: fileIds.map(e => e.id) }, accountId: account.id } })
            await tx.folderSharing.deleteMany({ where: { folderId: id, accountId: account.id } })
            await tx.file.deleteMany({ where: { folderId: id, accountId: account.id } })
            await tx.folder.delete({ where: { id, accountId: account.id } })
        })

        const ftp = new FtpLibrary(source.ftpPort)
        const currentDir = await this.queryPath(id)
        const workingDir = `${homePath}/${currentDir}`

        await ftp.removeDir(workingDir)
        
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
    async get(c: Context): Promise<Object | null> {
        const account = c.get('account')
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
                },
                folderSharings: {
                    select: {
                        toAccount: {
                            select: {
                                _count: true,
                            }
                        }
                    }
                },
                files: {
                    select: {
                        _count: true,
                        id: true,
                        fileName: true,
                        fileType: true,
                        fileSize: true,
                        fileSharings: {
                            select: {
                                toAccount: {
                                    select: {
                                        _count: true,
                                    }
                                }
                            }
                        }
                    }
                }
            }
        })

        return item ? {
            ...item,
            action: {
                isUpdate: account && account.id === item.accountId,
                isDelete: account && account.id === item.accountId,
                isSharing: account && account.id === item.accountId,
            }
        } : null
    }

    /**
     * 
     * @param c 
     */
    async myFolders(c: Context): Promise<Object[]> {
        const account = c.get('account')
        const query = c.req.query()
        const { keyword, startDate, endDate, parentId } = c.req.query()
        const where: FolderWhereInput = {
            parentId, accountId: account.id,
            createdAt: {
                gte: startDate ? new Date(startDate) : undefined,
                lt: endDate ? new Date(endDate) : undefined,
            },
            OR: [
                { folderName: { contains: keyword, mode: 'insensitive' } },
                {
                    files: {
                        some: {
                            fileName: { contains: keyword, mode: 'insensitive' }
                        }
                    }
                },
                {
                    account: {
                        fullname: { contains: keyword, mode: 'insensitive' }
                    }
                }
            ]
        }

        const orderBy = createOrderBy(query, { createdAt: 'desc' });
        const items = await prismaProxy.folder.findMany({
            where,
            orderBy,
            select: {
                id: true,
                folderName: true,
                source: true,
                updatedAt: true,
                createdAt: true,
                account: {
                    select: {
                        fullname: true,
                    },
                },
                parentId: true,
                parent: {
                    select: {
                        folderName: true,
                    }
                },
                folders: {
                    select: {
                        _count: true
                    }
                },
                folderSharings: {
                    select: {
                        toAccount: {
                            select: {
                                _count: true,
                            }
                        }
                    }
                },
                files: {
                    select: {
                        _count: true,
                        id: true,
                        fileName: true,
                        fileType: true,
                        fileSize: true,
                        fileSharings: {
                            select: {
                                toAccount: {
                                    select: {
                                        _count: true,
                                    }
                                }
                            }
                        }
                    }
                }
            }
        })

        return items
    }
}