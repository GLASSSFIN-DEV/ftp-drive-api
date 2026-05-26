import { JsonValue, InputJsonObject } from "@prisma/client/runtime/client";
import { FTPResponse } from "basic-ftp";
import { StatusCodes } from "http-status-codes";
import { env } from "../../config.js";
import { Context } from "hono";
import { HttpException } from "../../common/http-exception.js";
import createPagination from "../../common/pagination.js";
import { FileNewDto, FileChangeDto } from "../../dto/file.dto.js";
import { FileWhereInput } from "../../generated/prisma/models.js";
import { FtpLibrary } from "../../lib/ftp.js";
import { prismaProxy } from "../../lib/prisma.js";
import { IOkResponse, IItemPagination } from "../../types/common.js";
import { IRepositoryFolder, RepositoryFolder, ISource } from "../folder/folder.svc.js";

interface IFileObj {
    action?: {
        isUpdate: boolean;
        isDelete: boolean;
        isSharing: boolean;
    },
    account: {
        username: string;
        fullname: string | null;
    };
    folder: {
        folderName: string;
    };
    id: string;
    folderId: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    source: JsonValue;
    createdAt: Date;
    updatedAt: Date | null;
    accountId: string;
    fileSharings: {
        account: {
            username: string;
            fullname: string | null;
        };
        id: string;
    }[];
}

interface IFileHistory {
    account: {
        username: string;
        fullname: string | null;
    };
    id: string;
    json: JsonValue;
    createdAt: Date;
    version: number;
}

export interface IRepositoryFile {
    newFile(c: Context, obj: FileNewDto): Promise<IOkResponse<{ remotePath: string }>>;
    changeFile(c: Context): Promise<IOkResponse>;
    removeFile(c: Context): Promise<IOkResponse>;
    lists(c: Context): Promise<IItemPagination<IFileObj[]>>;
    versions(c: Context): Promise<IFileHistory[]>;
    get(c: Context): Promise<Object | null>;
    myFiles(c: Context): Promise<Object[]>;
}

export class RepositoryFile implements IRepositoryFile {
    private readonly folderRepo: IRepositoryFolder = new RepositoryFolder()

    constructor() {
        this.folderRepo = new RepositoryFolder()
    }

    /**
     * 
     * @param c 
     */
    async newFile(c: Context, obj: FileNewDto): Promise<IOkResponse<{ remotePath: string }>> {
        const account = c.get('account')
        const homePath = account.homePath
        const folder = await prismaProxy.folder.findFirst({ where: { id: obj.folderId, accountId: account.id } })

        if (!folder) throw new HttpException({
            errCode: 'FOLDER_NOT_FOUND',
            statusCode: StatusCodes.NOT_FOUND,
            messages: ['Selected folder not found!']
        })

        try {
            const remotePath = await this.folderRepo.realPath(folder.id)
            const workingDir = `${homePath}/${remotePath}`.replace(/\/+/g, '/')

            await prismaProxy.$transaction(async (tx) => {
                const source: ISource = {
                    ftpHost: env.FTP_HOST,
                    ftpPort: obj.siteId,
                    remotePath: workingDir,
                }

                await tx.file.upsert({
                    where: {
                        folderId_fileName: {
                            folderId: obj.folderId,
                            fileName: obj.fileName,
                        },
                    },
                    create: {
                        fileName: obj.fileName,
                        folderId: obj.folderId,
                        accountId: account.id,
                        fileSize: obj.fileSize,
                        fileType: obj.fileType,
                        source: source as any,
                        recordStatus: 'ACTIVE',
                    },
                    update: {
                        fileSize: obj.fileSize,
                        fileType: obj.fileType,
                        updatedAt: new Date(),
                    },
                })
            })

            return {
                statusCode: StatusCodes.CREATED,
                messages: ['File uploaded'],
                payload: { remotePath }
            } satisfies IOkResponse
        } finally {

        }
    }

    /**
     * 
     * @param c 
     */
    async changeFile(c: Context): Promise<IOkResponse> {
        const account = c.get('account')
        const homePath = account.homePath
        const id = c.req.param('id')
        const obj: FileChangeDto = c.get('validatedBody') as FileChangeDto
        const folder = await prismaProxy.folder.findFirst({ where: { id: obj.folderId, accountId: account.id } })

        if (!folder) throw new HttpException({
            errCode: 'FOLDER_NOT_FOUND',
            statusCode: StatusCodes.NOT_FOUND,
            messages: ['Selected folder not found!']
        })

        const exist = await prismaProxy.file.findFirst({ where: { id, accountId: account.id } })
        if (!exist) throw new HttpException({
            errCode: 'FILE_NOT_FOUND',
            statusCode: StatusCodes.NOT_FOUND,
            messages: ['Selected file not found!']
        })

        const nameExist = await prismaProxy.file.findFirst({ where: { accountId: account.id, fileName: obj.fileName, folderId: obj.folderId, id: { not: id } } })
        if (nameExist) throw new HttpException({
            errCode: 'FILE_EXIST',
            statusCode: StatusCodes.CONFLICT,
            messages: ['File name already exist!']
        })

        const ftp = new FtpLibrary(obj.siteId)
        try {
            await ftp.connect()
            const currentDir = await this.folderRepo.realPath(folder.id)
            const lastWorkDir = `${homePath}/${currentDir}`.replace(/\/+/g, '/')
            let newWorkDir = lastWorkDir

            // if new parent <> last parent
            if (obj.folderId && obj.folderId !== exist.folderId) {
                const parentPath = await this.folderRepo.realPath(obj.folderId)
                newWorkDir = `${homePath}/${parentPath}`.replace(/\/+/g, '/')

                await ftp.ensureDir(newWorkDir)
            }

            const fileHash = await ftp.send(newWorkDir, obj.fileName, 'XMD5')
            const lastVersion = await prismaProxy.fileHistory.findFirst({ where: { id: exist.id } })
            const version = lastVersion?.version ? lastVersion.version + 1 : 0

            await prismaProxy.$transaction(async (tx) => {
                const source: ISource = {
                    ftpHost: env.FTP_HOST,
                    ftpPort: obj.siteId,
                    remotePath: lastWorkDir, newWorkDir,
                    fileHash: fileHash as FTPResponse
                }

                await tx.file.update({
                    data: {
                        accountId: account.id,
                        folderId: obj.folderId,
                        fileName: obj.fileName,
                        fileHash: fileHash.message,
                        source: source as unknown as InputJsonObject,
                    },
                    where: { id, accountId: account.id }
                })

                await tx.fileHistory.create({
                    data: {
                        accountId: account.id,
                        fileId: exist.id,
                        json: obj as unknown as InputJsonObject,
                        version,
                        createdAt: new Date(),
                    }
                })
            })

            const file = await ftp.findFile(newWorkDir, obj.fileName)
            await ftp.rename(
                (lastWorkDir + '/' + obj.fileName).replace(/\/+/g, '/'),
                (newWorkDir + '/' + obj.fileName).replace(/\/+/g, '/')
            )


            return {
                statusCode: StatusCodes.CREATED,
                messages: ['File uploaded'],
                payload: { lastWorkDir, newWorkDir, file }
            } satisfies IOkResponse
        } finally {
            ftp.close()
        }
    }

    /**
     * 
     * @param c 
     */
    async removeFile(c: Context): Promise<IOkResponse> {
        const account = c.get('account')
        const homePath = account.homePath
        const id = c.req.param('id')
        const exist = await prismaProxy.file.findFirst({ where: { id, accountId: account.id } })

        if (!exist) throw new HttpException({
            errCode: 'FILE_NOT_FOUND',
            statusCode: StatusCodes.NOT_FOUND,
            messages: ['Selected file not found!']
        })

        const source = exist.source as unknown as ISource
        if (!source?.ftpPort) throw new HttpException({
            errCode: 'SOURCE_NOT_FOUND',
            statusCode: StatusCodes.NOT_FOUND,
            messages: ['Your folder source not defined!']
        })

        const ftp = new FtpLibrary(source.ftpPort)
        try {
            await ftp.connect()
            const currentDir = await this.folderRepo.realPath(exist.folderId)
            const lastWorkDir = `${homePath}/${currentDir}`.replace(/\/+/g, '/')
            await ftp.removeFile(lastWorkDir, exist.fileName)

            // delete file in database
            await prismaProxy.$transaction(async (tx) => {
                await tx.fileHistory.deleteMany({ where: { fileId: id, accountId: account.id } })
                await tx.fileSharing.deleteMany({ where: { fileId: id, accountId: account.id } })
                await tx.file.delete({ where: { id, accountId: account.id } })
            })

            return {
                statusCode: StatusCodes.OK,
                messages: ['File Deleted']
            } satisfies IOkResponse
        } finally {
            ftp.close()
        }
    }

    /**
     * 
     * @param c 
     */
    async lists(c: Context): Promise<IItemPagination<IFileObj[]>> {
        const account = c.get('account')
        const { page, pageSize, keyword, startDate, endDate, accountId } = c.req.query()
        const where: FileWhereInput = {
            fileName: { contains: keyword, mode: 'insensitive' },
            createdAt: {
                gte: startDate ? new Date(startDate) : undefined,
                lt: endDate ? new Date(endDate) : undefined,
            },
        }

        if (accountId) where.accountId = accountId
        const totalRows = await prismaProxy.file.count({ where })
        if (totalRows === 0) return {
            items: [],
            rbac: account.rbac,
            pagination: {
                page: Number(page),
                pageSize: Number(pageSize)
            }
        } satisfies IItemPagination

        const pagination = createPagination(Number(page), Number(pageSize), totalRows);
        const items: IFileObj[] = await prismaProxy.file.findMany({
            where,
            take: pagination.take,
            skip: pagination.skip,
            select: {
                id: true,
                fileName: true,
                fileSize: true,
                fileType: true,
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
                folderId: true,
                folder: {
                    select: {
                        folderName: true
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
    async get(c: Context): Promise<IFileObj | null> {
        const account = c.get('account')
        const id = c.req.param('id')
        const item: IFileObj | null = await prismaProxy.file.findFirst({
            where: { id },
            select: {
                id: true,
                fileName: true,
                fileSize: true,
                fileType: true,
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
                folderId: true,
                folder: {
                    select: {
                        folderName: true
                    }
                },
                fileSharings: {
                    select: {
                        id: true,
                        toAccountId: true,
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
    async myFiles(c: Context): Promise<Object[]> {
        const account = c.get('account')
        const folderId = c.req.param('id')

        const { keyword, startDate, endDate } = c.req.query()
        const where: FileWhereInput = {
            folderId, accountId: account.id,
            createdAt: {
                gte: startDate ? new Date(startDate) : undefined,
                lt: endDate ? new Date(endDate) : undefined,
            },
            AND: {
                OR: [
                    { fileName: { contains: keyword, mode: 'insensitive' } },
                ]
            }
        }

        const items = await prismaProxy.file.findMany({
            where,
            select: {
                id: true,
                fileName: true,
                fileSize: true,
                fileType: true,
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
                folderId: true,
                folder: {
                    select: {
                        folderName: true
                    }
                },
                fileSharings: {
                    select: {
                        id: true,
                        toAccountId: true,
                        toAccount: {
                            select: {
                                username: true,
                                fullname: true,
                            }
                        }
                    }
                }
            }
        })

        return items
    }

    /**
     * 
     * @param c 
     */
    async versions(c: Context): Promise<IFileHistory[]> {
        const account = c.get('account')
        const fileId = c.req.param('id')
        const items = await prismaProxy.fileHistory.findMany({
            where: { fileId },
            select: {
                id: true,
                version: true,
                json: true,
                createdAt: true,
                account: {
                    select: {
                        username: true,
                        fullname: true,
                    }
                }
            }
        })

        return items
    }
}