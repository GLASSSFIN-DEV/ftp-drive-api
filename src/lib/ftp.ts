
import { HttpException } from '@/common/http-exception'
import { env } from '@/config'
import { IOkResponse } from '@/types/common'
import { AccessOptions, Client, FileInfo, FTPResponse } from 'basic-ftp'
import { PassThrough, Readable } from 'stream'
import { StatusCodes } from 'http-status-codes'
import logger from '@/lib/logger'

interface IFtpConfig { secure: boolean | 'implicit' }
export interface IFtpLibrary {
    uploadFile(remotePath: string, obj: { buffer: ArrayBuffer; fileName: string }): Promise<IOkResponse<{
        file: FileInfo;
        workingDir: string;
    }>>;
    streamFile(remotePath: string, fileName: string): Promise<{
        stream: ReadableStream<Uint8Array<ArrayBufferLike>>;
        size: number;
    }>;
    getInfo(remotePath: string, name: string): Promise<IOkResponse<FileInfo>>;
    rename(oldPath: string, newPath: string): Promise<IOkResponse<FTPResponse>>;
    removeFile(remotePath: string, fileName: string): Promise<IOkResponse<FTPResponse>>;
    removeDir(remotePath: string): Promise<IOkResponse>;
    folderExist(remotePath: string): Promise<boolean>;
    send(remotePath: string, name: string, command: string): Promise<FTPResponse>;
    debug(remotePath: string): Promise<{ fromPath: string; items: FileInfo[]; toPath: string; }>;
}

export class FtpLibrary implements IFtpLibrary {
    private client: Client = new Client();
    private port: number = 990;

    constructor(port: number = 990) {
        this.client = new Client()
        this.port = port;
        this.client.ftp.log = (message) => logger.http(`[ftp:${port}] ${message}`)
        this.client.ftp.verbose = true
    }

    private async connect() {
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
    async uploadFile(remotePath: string, obj: { buffer: ArrayBuffer; fileName: string; }): Promise<IOkResponse<{
        file: FileInfo;
        workingDir: string;
    }>> {
        await this.connect()
        await this.client.pwd()
        await this.client.ensureDir(remotePath)

        const readable = this.arrayBufferToStream(obj.buffer)
        this.client.trackProgress(info => {
            logger.http('[ftp]', { ...info })
        })

        await this.client.uploadFrom(readable, obj.fileName)
        const workingDir = await this.client.pwd()
        const file = await this.getInfo(workingDir, obj.fileName)

        this.client.trackProgress()
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
    async streamFile(remotePath: string, fileName: string): Promise<{
        stream: ReadableStream<Uint8Array<ArrayBufferLike>>;
        size: number;
    }> {
        await this.connect()
        await this.client.pwd()
        const client = this.client;

        this.client.trackProgress(info => {
            logger.http('[ftp]', { ...info })
        })
        
        const lists = await this.client.list(remotePath)
        const files = lists.filter(e => !e.isDirectory)
        const file = files.find(e => e.name === fileName)

        if (!file)
            throw new HttpException({
                errCode: 'FTP_FILE_NOT_FOUND',
                statusCode: 404,
                messages: ['File not found in listing directory']
            })

        const pass = new PassThrough()
        await this.client.downloadTo(pass, fileName)
            .then(() => {
                pass.end();
                this.client.close();
            })
            .catch((err) => {
                pass.destroy(err);
                this.client.close();
            });

        this.client.trackProgress()
        const stream = new ReadableStream<Uint8Array>({
            start(controller) {
                pass.on("data", (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
                pass.on("end", () => controller.close());
                pass.on("error", (err) => controller.error(err));
            },
            cancel() {
                pass.destroy();
                client.close()
            },
        });

        return {
            stream,
            size: file.size,
        }
    }

    /**
     * 
     * @param remotePath 
     * @param name 
     * @returns 
     */
    async getInfo(remotePath: string, name: string): Promise<IOkResponse<FileInfo>> {
        await this.connect()
        await this.client.pwd()

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
    async rename(oldPath: string, newPath: string): Promise<IOkResponse<FTPResponse>> {
        await this.connect()
        await this.client.pwd()
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
    async removeFile(remotePath: string, fileName: string): Promise<IOkResponse<FTPResponse>> {
        await this.connect()
        await this.client.pwd()

        const fullPath = `${remotePath}/${fileName}`
        const res = await this.client.remove(fullPath)

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
    async removeDir(remotePath: string): Promise<IOkResponse> {
        await this.connect()
        await this.client.pwd()

        await this.client.removeDir(remotePath)
        this.client.close()

        return {
            statusCode: 200,
            messages: ['Success remove folder'],
        } satisfies IOkResponse
    }

    /**
    * 
    * @param remotePath 
    */
    async folderExist(remotePath: string): Promise<boolean> {
        await this.connect()
        await this.client.pwd()
        await this.client.ensureDir(remotePath)

        return true
    }

    /**
     * 
     * @param remotePath 
     * @param name 
     */
    async send(remotePath: string, name: string, command: string): Promise<FTPResponse> {
        await this.connect()
        await this.client.pwd()
        await this.client.ensureDir(remotePath)

        const features = await this.client.features()
        if (!features.has(command)) throw new HttpException({
            errCode: 'FILE_HASH_NOT_IMPLEMENTED',
            statusCode: StatusCodes.NOT_IMPLEMENTED,
            messages: ['XMD5 NOT_IMPLEMENTED']
        })

        const path = remotePath + name
        const res = await this.client.send(`XMD5 ${path.replace(/\/+/g, '/')}`)

        return res
    }

    /**
     * 
     * @param remotePath 
     * @returns 
     */
    async debug(remotePath: string): Promise<{ fromPath: string; items: FileInfo[]; toPath: string; }> {
        await this.connect()
        const fromPath = await this.client.pwd()
        await this.client.ensureDir(remotePath)
        const items = await this.client.list()
        const toPath = await this.client.pwd()

        return { fromPath, items, toPath }
    }
}