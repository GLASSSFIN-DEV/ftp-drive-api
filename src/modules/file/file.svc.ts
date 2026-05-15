import { HttpException } from "@/common/http-exception";
import { IFtpLibrary, FtpLibrary } from "@/lib/ftp";
import { IItemPagination, IOkResponse } from "@/types/common";
import { Context } from "hono";
import { IRepositoryFolder, RepositoryFolder } from "../folder/folder.svc";
import { FileChangeDto, FileNewDto } from "@/dto/file.dto";
import prismaProxy from "@/lib/prisma";
import { StatusCodes } from "http-status-codes";
import { env } from '@/config';
import { InputJsonObject, JsonValue } from "@prisma/client/runtime/client";
import { FTPResponse } from "basic-ftp";
import createPagination from "@/common/pagination";
import { FileWhereInput } from "@/generated/prisma/models";

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
}[]

interface IFileSource { ftpHost: string; ftpPort: number; remotePath?: string; oldPath?: string; fileHash?: FTPResponse }
export interface IRepositoryFile {
    newFile(c: Context): Promise<IOkResponse>;
    changeFile(c: Context): Promise<IOkResponse>;
    removeFile(c: Context): Promise<IOkResponse>;
    lists(c: Context): Promise<IItemPagination<IFileObj[]>>;
    get(c: Context): Promise<IOkResponse<IFileObj | null>>;
}

export class RepositoryFile implements IRepositoryFile {
    private readonly ftp: IFtpLibrary = new FtpLibrary()
    private readonly ftpPort: number = 990
    private readonly folderRepo: IRepositoryFolder = new RepositoryFolder()

    constructor(ftpPort: number = 990) {
        this.folderRepo = new RepositoryFolder(ftpPort)
        this.ftp = new FtpLibrary(ftpPort)
        this.ftpPort = ftpPort;
    }

    /**
     * 
     * @param c 
     */
    async newFile(c: Context): Promise<IOkResponse> {
        const account = c.get('account')
        const obj: FileNewDto = c.get('validatedBody') as FileNewDto
        const folder = await prismaProxy.folder.findFirst({ where: { id: obj.folderId, accountId: account.id } })

        if (!folder) throw new HttpException({
            errCode: 'FOLDER_NOT_FOUND',
            statusCode: StatusCodes.NOT_FOUND,
            messages: ['Selected folder not found!']
        })

        const remotePath = await this.folderRepo.queryPath(folder.id)
        await this.ftp.folderExist(remotePath)
        const fileHash = await this.ftp.send(remotePath, obj.fileName, 'XMD5')

        await prismaProxy.$transaction(async (tx) => {
            const source: IFileSource = {
                ftpHost: env.FTP_HOST,
                ftpPort: this.ftpPort,
                remotePath,
                fileHash: fileHash as FTPResponse
            }

            await tx.file.create({
                data: {
                    accountId: account.id,
                    folderId: obj.folderId,
                    fileName: obj.fileName,
                    fileSize: obj.fileSize,
                    fileType: obj.fileType,
                    fileHash: fileHash.message,
                    source: source as unknown as InputJsonObject,
                    recordStatus: 'ACTIVE'
                }
            })
        })

        const file = await this.ftp.getInfo(remotePath, obj.fileName)
        return {
            statusCode: StatusCodes.CREATED,
            messages: ['File uploaded'],
            payload: { remotePath, file }
        } satisfies IOkResponse
    }

    /**
     * 
     * @param c 
     */
    async changeFile(c: Context): Promise<IOkResponse> {
        const account = c.get('account')
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

        const nameExist = await prismaProxy.file.findFirst({ where: { accountId: account.id, folderName: obj.fileName, folderId: obj.folderId, id: { not: id } } })
        if (nameExist) throw new HttpException({
            errCode: 'FILE_EXIST',
            statusCode: StatusCodes.CONFLICT,
            messages: ['File name already exist!']
        })

        const remotePath = await this.folderRepo.queryPath(folder.id)
        await this.ftp.folderExist(remotePath)
        const fileHash = await this.ftp.send(remotePath, obj.fileName, 'XMD5')

        await prismaProxy.$transaction(async (tx) => {
            const source: IFileSource = {
                ftpHost: env.FTP_HOST,
                ftpPort: this.ftpPort,
                remotePath,
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
        })

        const file = await this.ftp.getInfo(remotePath, obj.fileName)
        if (obj.folderId !== exist.folderId) {
            const oldPath = await this.folderRepo.queryPath(exist.folderId)
            const newPath = await this.folderRepo.queryPath(obj.folderId)
            await this.ftp.rename(
                (oldPath + '/' + obj.fileName).replace(/\/+/g, '/'),
                (newPath + '/' + obj.fileName).replace(/\/+/g, '/')
            )
        }

        return {
            statusCode: StatusCodes.CREATED,
            messages: ['File uploaded'],
            payload: { remotePath, file }
        } satisfies IOkResponse
    }

    /**
     * 
     * @param c 
     */
    async removeFile(c: Context): Promise<IOkResponse> {
        const account = c.get('account')
        const id = c.req.param('id')
        const exist = await prismaProxy.file.findFirst({ where: { id, accountId: account.id } })

        if (!exist) throw new HttpException({
            errCode: 'FILE_NOT_FOUND',
            statusCode: StatusCodes.NOT_FOUND,
            messages: ['Selected file not found!']
        })

        await prismaProxy.$transaction(async (tx) => {
            await tx.fileSharing.deleteMany({ where: { fileId: id, accountId: account.id } })
            await tx.file.delete({ where: { id, accountId: account.id } })
        })

        const remotePath = await this.folderRepo.queryPath(exist.folderId)
        await this.ftp.removeFile(remotePath, exist.fileName)

        return {
            statusCode: StatusCodes.OK,
            messages: ['File Deleted']
        } satisfies IOkResponse
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
    async get(c: Context): Promise<IOkResponse<IFileObj | null>> {
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