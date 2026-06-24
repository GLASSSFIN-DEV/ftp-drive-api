
import { extractText, getMeta } from 'unpdf'
import { HttpException } from '../common/http-exception.js';
import { StatusCodes } from 'http-status-codes';

export interface IFileParser {
    pdfParser(buffer: Buffer, options: IChunkOpt): Promise<IPdfParser>;
}

interface IChunkItem { text: string; start: number; end: number; }
interface IChunkOpt { chunkSize: number; chunkOverlap: number; preservePageBreaks: boolean; separator: string; includeMeta: boolean }
interface IFinalChunk {
    index: number;
    text: string;
    charStart: number;
    charEnd: number;
    pages: number[];
    tokenEst: number;
}
export interface IPdfParser {
    meta?: Record<string, any> | undefined;
    chunks: {
        index: number;
        text: string;
        charStart: number;
        charEnd: number;
        pages: number[];
        tokenEst: number;
    }[];
    totalPages: number;
    totalChunks: number;
}

export class FileParser implements IFileParser {
    constructor() { }

    /**
     * 
     * @param text 
     * @param chunkSize 
     * @param chunkOverlap 
     * @param separator 
     */
    private splitWithOverlap(text: string, chunkSize: number = 500, chunkOverlap: number = 50, separator: string): IChunkItem[] {
        const chunks: IChunkItem[] = []
        let start = 0

        while (start < text.length) {
            let end: number = Math.min(start + chunkSize, text.length)
            if (end < text.length) {
                const window = text.slice(start, end)
                const sepIdx = window.lastIndexOf(separator)
                const spaceIdx = window.lastIndexOf(" ")

                if (sepIdx > chunkSize * 0.5) {
                    end = start + sepIdx + separator.length
                } else if (spaceIdx > chunkSize * 0.5) {
                    end = start + spaceIdx + 1
                }
            }

            chunks.push({ text: text.slice(start, end).trim(), start, end })
            start = Math.max(start + 1, end - chunkOverlap)
        }

        return chunks
    }

    /**
     * 
     * @param charStart 
     * @param charEnd 
     * @param pageLength 
     */
    private resolvePage(charStart: number, charEnd: number, pageLengths: number[]): number[] {
        const pages: number[] = []
        let cursor = 0

        for (let i = 0; i < pageLengths.length; i++) {
            const pageStart = cursor
            const pageEnd = cursor + pageLengths[i]

            if (pageEnd > charStart && pageStart < charEnd) pages.push(i + 1)
            if (pageStart >= charEnd) break
            cursor = pageEnd
        }

        return pages.length ? pages : [1]
    }

    /**
     * 
     * @param buffer 
     * @param options 
     */
    async pdfParser(buffer: Buffer, options: IChunkOpt): Promise<IPdfParser> {
        const {
            chunkSize,
            chunkOverlap,
            preservePageBreaks,
            separator,
            includeMeta
        } = options

        if (chunkOverlap >= chunkSize) {
            throw new HttpException({
                errCode: 'ERROR_PARSE_CONFIG',
                statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
                messages: [`Chunk overlap cannot greather or equal than chunkSize`]
            })
        }

        let data: Uint8Array<ArrayBuffer> | Uint8Array<ArrayBufferLike>;
        if (buffer instanceof ArrayBuffer) {
            data = new Uint8Array(buffer)
        } else if (ArrayBuffer.isView(buffer)) {
            data = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
        } else {
            throw new HttpException({
                errCode: 'ERROR_PARSE_CONFIG',
                statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
                messages: [`Required buffer type`]
            })
        }

        // 1. Extract the Pdf
        const { totalPages, text: pageTexts } = await extractText(data, { mergePages: false })
        const cleanedPages = pageTexts.map((page) => page.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim())
        const pageLengths = cleanedPages.map((p) => p.length + 1) // +1 is for join "\n"

        // 2. Get meta
        let meta: Record<string, any> = {};
        if (includeMeta) {
            try {
                const { info } = await getMeta(data)
                meta = info
            } catch (error) {
                meta = {}
            }
        }

        // 3. Build the chunk source
        const allChunks: IChunkItem[] = []
        if (preservePageBreaks) {
            // Process each page independently, then stitch overlapping boundary chunks
            let globalOffset = 0;

            for (let p = 0; p < cleanedPages.length; p++) {
                const pageText = cleanedPages[p]
                if (!pageText) {
                    globalOffset += pageLengths[p]
                    continue
                }

                const pageChunks = this.splitWithOverlap(
                    pageText,
                    chunkSize,
                    chunkOverlap,
                    separator
                )

                for (const c of pageChunks) {
                    allChunks.push({
                        text: c.text,
                        start: globalOffset + c.start,
                        end: globalOffset + c.end
                    })
                }

                globalOffset += pageLengths[p]
            }
        } else {
            // Merge all pages into one string, then chunk globally
            const fullText = cleanedPages.join("\n")
            const raw = this.splitWithOverlap(fullText, chunkSize, chunkOverlap, separator)
            allChunks.push(...raw)
        }

        // 4. Anotate each chunk with page numbers and token estimate
        const chunks = allChunks
            .filter((c) => c.text.length > 0) // drop empty chunks
            .map((c, idx) => ({
                index: idx,
                text: c.text,
                charStart: c.start,
                charEnd: c.end,
                pages: this.resolvePage(c.start, c.end, pageLengths),
                tokenEst: Math.ceil(c.text.length / 4)
            } satisfies IFinalChunk))

        const output = {
            chunks,
            totalPages,
            totalChunks: chunks.length,
            ...(includeMeta ? { meta } : {})
        }

        return output
    }

}