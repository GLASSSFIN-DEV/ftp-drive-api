import { InputJsonObject, JsonValue } from "@prisma/client/runtime/client";
import { Context } from "hono";
import { StatusCodes } from "http-status-codes";
import { FTPResponse } from "basic-ftp";
import { env } from "../../config.js";
import { HttpException } from "../../common/http-exception.js";
import createPagination, { createOrderBy } from "../../common/pagination.js";
import { FolderNewDto, FolderChangeDto } from "../../dto/folder.dto.js";
import { Folder } from "../../generated/prisma/client.js";
import { FolderWhereInput } from "../../generated/prisma/models.js";
import { FtpLibrary } from "../../lib/ftp.js";
import { prismaProxy } from "../../lib/prisma.js";
import { IOkResponse, IItemPagination } from "../../types/common.js";
import { UploadSaga } from "../media/upload-saga.js";
import pLimit from "p-limit";

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
    folderSharings: {
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
    createFolderChain(
        segments: string[],
        rootParentId: string | undefined,
        accountId: string,
        source: ISource,
        saga: UploadSaga
    ): Promise<{ id: string; name: string }>;
    lists(c: Context): Promise<IItemPagination<IFolderObj[]>>;
    get(c: Context): Promise<Object | null>;
    /** Load all folders into a Map — pass the result to realPath to avoid N+1 queries. */
    loadFolderMap(): Promise<Map<string, Folder>>;
    realPath(folderId: string, folderMap?: Map<string, Folder>): Promise<string>;
    myFolders(c: Context): Promise<Object[]>;
}

export class RepositoryFolder implements IRepositoryFolder {
    constructor() { }

    /**
     * Loads every folder row once; pass the result to realPath to avoid
     * a full-table query on every call (fix #14).
     */
    public async loadFolderMap(): Promise<Map<string, Folder>> {
        const folders = await prismaProxy.folder.findMany()
        const map = new Map<string, Folder>()
        for (const folder of folders) map.set(folder.id, folder)
        return map
    }

    /**
     * @param folderId
     * @param folderMap  Pre-loaded map from loadFolderMap(). When omitted a
     *                   fresh DB query is issued (convenience for single calls).
     */
    public async realPath(folderId: string, folderMap?: Map<string, Folder>): Promise<string> {
        const map = folderMap ?? await this.loadFolderMap()

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

        const ftpHost = obj.ftpHost ?? env.FTP_HOST
        const ftp = new FtpLibrary(obj.siteId, ftpHost)
        try {
            let parentPath = ''
            await ftp.connect()
            if (obj.parentId) parentPath = await this.realPath(obj.parentId)

            const workingDir = `${homePath}/${parentPath}`
            const finalPath = (workingDir + '/' + obj.folderName).replace(/\/+/g, '/')
            console.log(`[finalPath]`, finalPath)
            // Fix #8: create the FTP directory first; if the DB write fails the
            // reconciler will clean up the orphaned directory.
            await ftp.ensureDir(finalPath)

            await prismaProxy.$transaction(async (tx) => {
                const source: ISource = {
                    ftpHost,
                    ftpPort: obj.siteId,
                    remotePath: finalPath
                }

                await tx.folder.create({
                    data: {
                        folderName: obj.folderName,
                        parentId: obj.parentId,
                        label: obj.label,
                        source: source as unknown as InputJsonObject,
                        accountId: account.id,
                        recordStatus: 'ACTIVE'
                    }
                })
            })
            return {
                statusCode: StatusCodes.CREATED,
                messages: ['Create Success'],
                payload: { remotePath: finalPath }
            } satisfies IOkResponse
        } finally {
            ftp.close()
        }
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

        const existSource = exist.source as ISource
        const ftpHost = existSource?.ftpHost ?? obj.ftpHost ?? env.FTP_HOST
        const ftp = new FtpLibrary(obj.siteId, ftpHost)
        try {
            await ftp.connect()
            const currentDir = await this.realPath(exist.id)
            const lastWorkDir = `${homePath}/${currentDir}`.replace(/\/+/g, '/')

            // Fix #7: always derive newWorkDir from the parent directory + new folder name
            // so a name-only rename doesn't accidentally nest the folder inside itself.
            let newParentDir: string
            if (obj.parentId && obj.parentId !== exist.parentId) {
                // Moving to a different parent — ensure that parent dir exists on FTP
                const parentPath = await this.realPath(obj.parentId)
                newParentDir = `${homePath}/${parentPath}`.replace(/\/+/g, '/')
                await ftp.ensureDir(newParentDir)
            } else if (exist.parentId) {
                const parentPath = await this.realPath(exist.parentId)
                newParentDir = `${homePath}/${parentPath}`.replace(/\/+/g, '/')
            } else {
                newParentDir = homePath
            }
            const newWorkDir = `${newParentDir}/${obj.folderName}`.replace(/\/+/g, '/')

            // Rename on FTP first; roll back if the DB write fails
            await ftp.rename(lastWorkDir, newWorkDir)

            try {
                await prismaProxy.$transaction(async (tx) => {
                    const source: ISource = {
                        ftpHost,
                        ftpPort: obj.siteId,
                        remotePath: lastWorkDir, newWorkDir
                    }

                    await tx.folder.update({
                        data: {
                            folderName: obj.folderName,
                            parentId: obj.parentId,
                            label: obj.label,
                            source: source as unknown as InputJsonObject,
                            accountId: account.id,
                            updatedAt: new Date()
                        },
                        where: { id, accountId: account.id }
                    })
                })
            } catch (dbError) {
                try { await ftp.rename(newWorkDir, lastWorkDir) } catch { /* ignore */ }
                throw dbError
            }

            return {
                statusCode: StatusCodes.CREATED,
                messages: ['Change Success'],
                payload: { lastWorkDir, newWorkDir }
            } satisfies IOkResponse
        } finally {
            ftp.close()
        }
    }

    /**
     * Get nested folders for delete purpose
     * 
     * @param parentId 
     * @param accountId 
     * @returns 
     */
    private async getNestedFolders(parentId: string, accountId: string): Promise<string[]> {
        const childs = await prismaProxy.folder.findMany({ where: { parentId, accountId } })
        if (childs.length === 0) return [parentId]

        const limit = pLimit(5)
        const nestedIds = await Promise.all(childs.map(async (e) => limit(async () => await this.getNestedFolders(e.id, accountId))))

        return [parentId, ...nestedIds.flat()]
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

        const folderIds = await this.getNestedFolders(id, account.id)
        const fileIds = await prismaProxy.file.findMany({ where: { folderId: { in: folderIds }, accountId: account.id } })

        const ftp = new FtpLibrary(source.ftpPort, source.ftpHost ?? env.FTP_HOST)
        try {
            await ftp.connect()
            const currentDir = await this.realPath(id)
            const workingDir = `${homePath}/${currentDir}`

            // Fix #9: delete DB records first; if the FTP removal fails afterwards
            // the orphan reconciler will clean up the dangling directory.
            await prismaProxy.$transaction(async (tx) => {
                await tx.fileSharing.deleteMany({ where: { fileId: { in: fileIds.map(e => e.id) }, accountId: account.id } })
                await tx.folderSharing.deleteMany({ where: { folderId: { in: folderIds }, accountId: account.id } })
                await tx.file.deleteMany({ where: { id: { in: fileIds.map(e => e.id) }, accountId: account.id } })
                await tx.folder.deleteMany({ where: { id: { in: folderIds }, accountId: account.id } })
            })

            await ftp.removeDir(workingDir.replace(/\/+/g, '/'))

            return {
                statusCode: StatusCodes.OK,
                messages: ['Remove Success'],
                payload: {
                    folder: exist,
                    files: fileIds,
                }
            } satisfies IOkResponse
        } finally {
            ftp.close()
        }
    }

    /**
     * 
     * @param segments 
     * @param rootParentId 
     * @param accountId 
     * @param source 
     * @returns 
     */
    async createFolderChain(
        segments: string[],       // ["myFolder", "sub"]
        rootParentId: string | undefined,
        accountId: string,
        source: ISource,
        saga: UploadSaga,
    ): Promise<{ id: string; name: string }> {           // returns the leaf folderId
        let parentId: string | undefined = rootParentId
        let folderName: string | undefined

        for (const seg of segments) {
            // NORMAL NESTED BEHAVIOUR
            // reuse existing folders
            let folder = await prismaProxy.folder.findFirst({
                where: {
                    folderName: seg,
                    parentId,
                    accountId,
                    recordStatus: 'ACTIVE',
                },
            })

            if (!folder) {
                folder = await prismaProxy.folder.create({
                    data: {
                        folderName: seg,
                        parentId: parentId ?? undefined,
                        accountId,
                        source: source as any,
                        recordStatus: 'ACTIVE',
                    },
                })

                saga.track({ type: 'folder', id: folder.id })
            }

            parentId = folder.id
            folderName = folder.folderName
        }

        return {
            id: parentId!,
            name: folderName!
        }
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
                folderSharings: {
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
            accountId: account.id,
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

        where['parentId'] = parentId ?? null
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
                accountId: true,
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
                        folderName: true,
                    }
                },
                folderSharings: {
                    select: {
                        id: true,
                        toAccountId: true,
                        toAccount: {
                            select: {
                                fullname: true,
                            }
                        }
                    }
                },
                files: {
                    select: {
                        id: true,
                        fileName: true,
                        fileType: true,
                        fileSize: true,
                        fileSharings: {
                            select: {
                                toAccount: {
                                    select: {
                                        fullname: true,
                                    }
                                }
                            }
                        }
                    }
                }
            }
        })

        return items.map(e => ({ ...e, isUpdate: e.accountId === account.id }))
    }
}