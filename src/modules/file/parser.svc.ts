import { Readable } from 'stream';
import { Context } from "hono";
import { FileParser, IPdfParser } from "../../lib/file-parser.js";
import { FtpLibrary } from "../../lib/ftp.js";
import { prisma } from "../../lib/prisma.js";
import { inngest } from "../../lib/inngest-client.js";
import pLimit from 'p-limit';
import pgvector from 'pgvector';
import { v7 } from 'uuid';
import { embed, intentify } from '../../lib/embedder.js';
import { ISource } from "../folder/folder.svc.js";
import { IOkResponse } from "../../types/common.js";

export interface IQueueFile {
    id: string;
    fileName: string;
    ftpHost: string;
    ftpPort: number;
    remotePath: string;
}

export class RepositoryFileParser {
    private readonly parser = new FileParser()

    async pdfParse(_c: Context): Promise<IOkResponse> {
        const files = await prisma.file.findMany({
            where: {
                recordStatus: 'ACTIVE',
                fileType: 'application/pdf',
            }
        })

        const data: IQueueFile[] = files.map(e => {
            const source = e.source as ISource;
            return {
                id: e.id,
                fileName: e.fileName,
                ftpHost: source.ftpHost,
                ftpPort: source.ftpPort,
                remotePath: source.remotePath!,
            }
        })

        await this.enqueue(data)
        return {
            statusCode: 200,
            messages: [`Insert ${files.length} file(s) into queue to parse`]
        } satisfies IOkResponse
    }

    /**
     * Fires one Inngest event per file — Vercel-safe, returns immediately.
     */
    private async enqueue(items: IQueueFile[]): Promise<void> {
        await inngest.send(
            items.map(item => ({
                name: 'drive/pdf.parse.requested' as const,
                data: item,
            }))
        )
    }

    /**
     * Inngest step 1 — FTP download + PDF parse.
     * Returns plain JSON so Inngest can checkpoint it between steps.
     */
    async downloadAndParse(obj: IQueueFile): Promise<IPdfParser> {
        const ftp = new FtpLibrary(obj.ftpPort, obj.ftpHost)
        try {
            await ftp.connect()
            const readable = await ftp.downloadStream(obj.remotePath, obj.fileName)
            const buffer = await this.streamToBuffer(readable)
            return this.parser.pdfParser(buffer, {
                chunkSize: 500,
                chunkOverlap: 50,
                preservePageBreaks: false,
                separator: '\n',
                includeMeta: true,
            })
        } finally {
            ftp.close()
        }
    }

    /**
     * Inngest step 2 — embed + intent per chunk, persist to FileVector.
     */
    async embedAndStore(fileId: string, parsed: IPdfParser): Promise<void> {
        const limit = pLimit(3)
        const processed = await Promise.all(
            parsed.chunks.map(chunk =>
                limit(async () => {
                    const [vector, intent] = await Promise.all([
                        embed(chunk.text).then(pgvector.toSql),
                        intentify(chunk.text),
                    ])
                    return { id: v7(), chunk, vector, intent }
                })
            )
        )

        await prisma.$transaction([
            prisma.fileVector.deleteMany({ where: { fileId } }),
            ...processed.map(({ id, chunk, vector, intent }) =>
                prisma.$executeRaw`
                    INSERT INTO "drive"."FileVector" (id, "fileId", content, metadata, embedding, intent, "pageNumber", "createdAt")
                    VALUES (
                        ${id},
                        ${fileId},
                        ${chunk.text},
                        ${JSON.stringify({
                            index: chunk.index,
                            pages: chunk.pages,
                            charStart: chunk.charStart,
                            charEnd: chunk.charEnd,
                            tokenEst: chunk.tokenEst,
                            totalPages: parsed.totalPages,
                        })}::jsonb,
                        ${vector}::vector,
                        ARRAY(SELECT jsonb_array_elements(${JSON.stringify(intent)}::jsonb)),
                        ${chunk.pages[0]},
                        now()
                    )
                `
            ),
        ])
    }

    private streamToBuffer(readable: Readable): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = []
            readable.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)))
            readable.on('end', () => resolve(Buffer.concat(chunks)))
            readable.on('error', reject)
        })
    }
}
