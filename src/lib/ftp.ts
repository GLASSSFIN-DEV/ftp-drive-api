
import { HttpException } from '@/common/http-exception'
import { env } from '@/config'
import { IOkResponse } from '@/types/common'
import { AccessOptions, Client, FileInfo, FTPResponse } from 'basic-ftp'
import { PassThrough, Readable } from 'stream'
import { lookup } from 'mime-types'
import { StatusCodes } from 'http-status-codes'

interface IFtpConfig { secure: boolean | 'implicit' }
export interface IFtpLibrary {
    uploadFile(remotePath: string, obj: { buffer: ArrayBuffer; fileName: string }): Promise<IOkResponse<{ file: FileInfo; workingDir: string; }> | HttpException>;
    streamFile(remotePath: string, fileName: string): Promise<{ buffer: Buffer; contentType: string | boolean } | HttpException>;
    getInfo(remotePath: string, name: string): Promise<IOkResponse<FileInfo> | HttpException>;
    rename(oldPath: string, newPath: string): Promise<IOkResponse<FTPResponse> | HttpException>;
    removeFile(remotePath: string, fileName: string): Promise<IOkResponse<FTPResponse> | HttpException>;
    removeDir(remotePath: string): Promise<IOkResponse<FTPResponse> | HttpException>;
    folderExist(remotePath: string): Promise<boolean | HttpException>;
    getFileHash(remotePath: string, name: string): Promise<FTPResponse | HttpException>;
}

export class FtpLibrary implements IFtpLibrary {
    private client: Client = new Client();
    private port: number = 990;

    constructor(port: number = 990) {
        this.client = new Client()
        this.port = port;
    }

    private async connect() {
        this.client.ftp.verbose = true
        const config: IFtpConfig = env.FTP_CONFIG
        const opts: AccessOptions = {
            host: env.FTP_HOST,
            port: this.port,
            user: env.FTP_USERNAME,
            password: env.FTP_PASSWORD,
            secure: config.secure,
        }

        try {
            await this.client.access(opts)
        } catch (error) {
            this.client.close()
            throw new HttpException({
                errCode: 'FTP_CONNECT_ISSUE',
                statusCode: 500,
                messages: ['Cannot connect to FTP Server']
            })
        }
    }

    /**
     * 
     * @param buffer 
     * @returns 
     */
    private arrayBufferToStream(buffer: ArrayBuffer): Readable {
        const readable = new Readable();
        readable.push(Buffer.from(buffer));
        readable.push(null);

        return readable;
    }

    /**
     * 
     * @param remotePath 
     * @param obj 
     * @returns 
     */
    async uploadFile(remotePath: string, obj: { buffer: ArrayBuffer; fileName: string; }): Promise<IOkResponse<{ file: FileInfo; workingDir: string; }> | HttpException> {
        await this.connect()
        await this.client.ensureDir(remotePath)

        const readable = this.arrayBufferToStream(obj.buffer)
        await this.client.uploadFrom(readable, obj.fileName)

        const workingDir = await this.client.pwd()
        const file = await this.getInfo(remotePath, obj.fileName)
        this.client.close()

        return {
            statusCode: 200,
            messages: ['File success to upload!'],
            payload: { workingDir, file: file.payload as FileInfo }
        } satisfies IOkResponse
    }

    /**
     * 
     * @param remotePath 
     * @param fileName 
     */
    async streamFile(remotePath: string, fileName: string): Promise<{ buffer: Buffer; contentType: string | boolean } | HttpException> {
        await this.connect()
        await this.client.ensureDir(remotePath)

        const lists = await this.client.list(remotePath)
        const files = lists.filter(e => !e.isDirectory)
        const file = files.find(e => e.name === fileName)

        if (!file)
            throw new HttpException({
                errCode: 'FTP_FILE_NOT_FOUND',
                statusCode: 404,
                messages: ['File not found in listing directory']
            })

        const chunks: Buffer[] = []
        const stream = new PassThrough()
        stream.on('data', (chunk) => chunks.push(chunk))

        await this.client.downloadTo(stream, fileName)
        this.client.close()

        return {
            buffer: Buffer.concat(chunks),
            contentType: lookup(file.name),
        }
    }

    /**
     * 
     * @param remotePath 
     * @param name 
     * @returns 
     */
    async getInfo(remotePath: string, name: string): Promise<IOkResponse<FileInfo> | HttpException> {
        await this.connect()
        await this.client.ensureDir(remotePath)

        const lists = await this.client.list(remotePath)
        const file = lists.find(e => e.name === name)

        if (!file)
            throw new HttpException({
                errCode: 'FTP_FILE_NOT_FOUND',
                statusCode: 404,
                messages: ['File not found in listing directory']
            })

        this.client.close()
        return {
            statusCode: 200,
            messages: ['Object found'],
            payload: file
        } satisfies IOkResponse
    }

    /**
     * 
     * @param oldPath 
     * @param newPath 
     */
    async rename(oldPath: string, newPath: string): Promise<IOkResponse<FTPResponse> | HttpException> {
        await this.connect()
        await this.client.ensureDir(oldPath)
        const res = await this.client.rename(oldPath, newPath)

        this.client.close()
        return {
            statusCode: 200,
            messages: ['Object rename success'],
            payload: res
        } satisfies IOkResponse
    }

    /**
     * 
     * @param remotePath 
     * @param fileName 
     */
    async removeFile(remotePath: string, fileName: string): Promise<IOkResponse<FTPResponse> | HttpException> {
        await this.connect()
        await this.client.ensureDir(remotePath)

        const lists = await this.client.list(remotePath)
        const file = lists.find(e => e.name === fileName)

        if (!file)
            throw new HttpException({
                errCode: 'FTP_FILE_NOT_FOUND',
                statusCode: 404,
                messages: ['File not found in listing directory']
            })

        const res = await this.client.remove(fileName)
        this.client.close()

        return {
            statusCode: 200,
            messages: ['Success remove file'],
            payload: res
        } satisfies IOkResponse
    }

    /**
     * 
     * @param remotePath 
     */
    async removeDir(remotePath: string): Promise<IOkResponse<FTPResponse> | HttpException> {
        await this.connect()
        await this.client.ensureDir(remotePath)

        const res = await this.client.remove(remotePath)
        this.client.close()

        return {
            statusCode: 200,
            messages: ['Success remove folder'],
            payload: res
        } satisfies IOkResponse
    }

    /**
    * 
    * @param remotePath 
    */
    async folderExist(remotePath: string): Promise<boolean | HttpException> {
        await this.connect()
        await this.client.ensureDir(remotePath)

        return true
    }

    /**
     * 
     * @param remotePath 
     * @param name 
     */
    async getFileHash(remotePath: string, name: string): Promise<FTPResponse | HttpException> {
        await this.connect()
        await this.client.ensureDir(remotePath)

        const features = await this.client.features()
        if (!features.has('XMD5')) throw new HttpException({
            errCode: 'FILE_HASH_NOT_IMPLEMENTED',
            statusCode: StatusCodes.NOT_IMPLEMENTED,
            messages: ['XMD5 NOT_IMPLEMENTED']
        })

        const path = remotePath + name
        const res = await this.client.send(`XMD5 ${path.replace(/\/+/g, '/')}`)

        return res
    }
}