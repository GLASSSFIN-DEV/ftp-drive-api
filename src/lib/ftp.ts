
import { AccessOptions, Client, FileInfo, FTPResponse } from 'basic-ftp'
import { PassThrough, Readable } from 'stream'
import { StatusCodes } from 'http-status-codes'
import logger from './logger.js'
import { env, Logs } from '../config.js'
import { HttpException } from '../common/http-exception.js'

export type FtpEntry = {
    path:        string       // full remote path
    isDirectory: boolean
    size:        number
    name:        string
}
export interface IFtpLibrary {
    uploadFile(remotePath: string, obj: { buffer: Readable; fileName: string }): Promise<void>;
    streamFile(remotePath: string, fileName: string): Promise<{
        stream: ReadableStream<Uint8Array>;
        size: number;
    }>;
    findFile(remotePath: string, name: string): Promise<FileInfo>;
    rename(oldPath: string, newPath: string): Promise<FTPResponse>;
    removeFile(remotePath: string, fileName: string): Promise<FTPResponse>;
    removeDir(remotePath: string): Promise<void>;
    ensureDir(remotePath: string): Promise<void>;
    listAllFiles(rootDir: string): Promise<FtpEntry[]>;
    listAllFilePaths(rootDir: string): Promise<string[]>;
    fileExists(remotePath: string): Promise<boolean>;
    send(remotePath: string, name: string, command: string): Promise<FTPResponse>;
    debug(rootDir: string): Promise<FtpEntry[]>;
    connect(): Promise<void>;
    close(): void;
}

export class FtpLibrary implements IFtpLibrary {
    private client: Client = new Client();
    private port: number = 990;

    constructor(port: number = 990) {
        this.client = new Client()
        this.port = port;
        // this.client.ftp.log = (message) => env.LOG === Logs.FTP ? logger.http(`[ftp:${port}] ${message}`) : console.debug(message)
        // this.client.ftp.verbose = true
    }

    async connect() {
        const opts: AccessOptions = {
            host: env.FTP_HOST,
            port: this.port,
            user: env.FTP_USERNAME,
            password: env.FTP_PASSWORD,
            secure: env.FTP_CONFIG as (boolean | 'implicit' | undefined),
            secureOptions: {
                rejectUnauthorized: env.NODE_REJECT_UNAUTHORIZE
            }
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
     * safe close connection
     */
    close(): void {
        this.client.close()
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
    async uploadFile(remotePath: string, obj: { buffer: Readable; fileName: string; }): Promise<void> {
        const pwd = await this.client.pwd()
        if (pwd !== remotePath) await this.client.ensureDir(remotePath)

        this.client.trackProgress(info => {
            logger.http('[ftp]', { ...info })
        })

        await this.client.uploadFrom(obj.buffer, obj.fileName)
        this.client.trackProgress()
        this.client.close()
    }

    /**
     * 
     * @param remotePath 
     * @param fileName 
     */
    async streamFile(remotePath: string, fileName: string): Promise<{
        stream: ReadableStream<Uint8Array>;
        size: number;
    }> {
        await this.client.pwd()

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
    async findFile(remotePath: string, name: string): Promise<FileInfo> {
        await this.client.pwd()

        const lists = await this.client.list(remotePath)
        const file = lists.find(e => e.name === name)

        if (!file)
            throw new HttpException({
                errCode: 'FTP_FILE_NOT_FOUND',
                statusCode: 404,
                messages: ['File not found in listing directory']
            })

        return file
    }

    /**
     * 
     * @param oldPath 
     * @param newPath 
     */
    async rename(oldPath: string, newPath: string): Promise<FTPResponse> {
        await this.client.pwd()
        const res = await this.client.rename(oldPath, newPath)

        return res
    }

    /**
     * 
     * @param remotePath 
     * @param fileName 
     */
    async removeFile(remotePath: string, fileName: string): Promise<FTPResponse> {
        await this.client.pwd()

        const fullPath = `${remotePath}/${fileName}`
        const res = await this.client.remove(fullPath)

        return res
    }

    /**
     * 
     * @param remotePath 
     */
    async removeDir(remotePath: string): Promise<void> {
        await this.client.pwd()
        await this.client.removeDir(remotePath)
    }

    /**
    *
    * @param remotePath
    */
    async ensureDir(remotePath: string): Promise<void> {
        const pwd = await this.client.pwd()
        if (pwd !== remotePath) await this.client.ensureDir(remotePath)
    }

    /**
     * Check whether a remote directory exists by attempting to list it.
     * Returns false on any error (including "no such directory").
     */
    async dirExists(remotePath: string): Promise<boolean> {
        try {
            await this.client.list(remotePath)
            return true
        } catch {
            return false
        }
    }

    /**
     *
     */
    async listAllFiles(rootDir: string = '/'): Promise<FtpEntry[]> {
        const results: FtpEntry[] = []
        const client = this.client
        
        async function walk(currentPath: string) {
            // list() lists the current working directory
            const entries: FileInfo[] = await client.list(currentPath)

            for (const entry of entries) {
                const fullPath = `${currentPath}/${entry.name}`.replace(/\/+/g, '/')

                results.push({
                    path: fullPath,
                    isDirectory: entry.isDirectory,
                    size: entry.size,
                    name: entry.name,
                })

                if (entry.isDirectory) {
                    // recurse into subdirectory
                    await walk(fullPath)
                }
            }
        }

        await walk(rootDir)
        return results
    }

    /**
     * Used by reconciler — returns ONLY file paths (no dirs)
     * 
     * @param rootDir 
     * @returns 
     */
    async listAllFilePaths(rootDir: string = '/'): Promise<string[]> {
        const all = await this.listAllFiles(rootDir)
        return all
            .filter(e => !e.isDirectory)
            .map(e => e.path)
    }

    /**
     * Check a single file exists without full listing 
     * 
     * @param remotePath 
     * @returns 
     */
    async fileExists(remotePath: string): Promise<boolean> {
        try {
            const dir     = remotePath.substring(0, remotePath.lastIndexOf('/'))
            const name    = remotePath.substring(remotePath.lastIndexOf('/') + 1)
            const entries = await this.client.list(dir)
            return entries.some(e => e.name === name && !e.isDirectory)
        } catch {
            return false
        }
    }

    /**
     * 
     * @param remotePath 
     * @param name 
     */
    async send(remotePath: string, name: string, command: string): Promise<FTPResponse> {
        const pwd = await this.client.pwd()
        if (pwd !== remotePath) await this.client.ensureDir(remotePath)

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
    async debug(rootDir: string = '/'): Promise<FtpEntry[]> {
        const listAllFiles = await this.listAllFiles(rootDir)

        return listAllFiles
    }
}