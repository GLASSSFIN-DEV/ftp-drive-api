import { Context } from "hono";
import { Prisma } from "../../generated/prisma/client.js"
import { prisma } from "../../lib/prisma.js"

interface ISuggestQuery { text: string; type: string; score: number }
interface IFolderSearchRow {
    id: string
    folderName: string
    parentId?: number | null
    createdAt: Date
    rank: number
}
interface IFileSearchRow {
    id: string
    fileName: string
    folderId: string
    pageNumbers: number[]
    snippetPageNumber?: number | null
    snippet?: string | null
    rank: number
}

interface ISearchResponse {
    suggestedQuery?: string
    searchedQuery?: string
    folders: IFolderSearchRow[]
    files: IFileSearchRow[]
}

interface IFileSearchRow_ extends IFileSearchRow {
    bestPageNumber?: number;
    latestPageNumber?: number;
}

export class RepositoryFullTextSearch {

    /**
     * 
     * @param q 
     * @param limit 
     * @returns 
     */
    private sqlCmdFolder(q: string, limit: number = 10) {
        const sql: Prisma.Sql = Prisma.sql`
            SELECT 
                id, 
                "folderName",
                "createdAt",
                ts_rank("folderNameFts", plainto_tsquery('indonesian', ${q})) AS rank
            FROM "Folder"
            WHERE "folderNameFts" @@ plainto_tsquery('indonesian', ${q})
            ORDER BY ts_rank("folderNameFts", plainto_tsquery('indonesian', ${q})) DESC
            LIMIT ${limit};
        `

        return sql
    }

    /**
     * 
     * @param q 
     * @param limit 
     */
    private sqlCmdFile(q: string, limit: number = 10) {
        const sql: Prisma.Sql = Prisma.sql`
            WITH query AS (
                SELECT plainto_tsquery('indonesian', ${q}) AS q
            ),
            page_matches AS (
                SELECT  
                    fv.id,
                    fv."content",
                    fv.metadata,
                    fv.intent,
                    fv."pageNumber",
                    f."fileName",
                    f."fileSize",
                    f."fileType",
                    f.source,
                    f."createdAt",
                    f."folderId",
                    f."accountId",
                    ts_rank(p."contentFts", q.q) AS page_rank
                FROM    "FileVector" AS fv
                JOIN    "File" AS f ON f.id = fv."fileId",
                    query AS q
                WHERE fv."contentFts" @@ q.q
            ),
            filename_matches AS (
                SELECT
                    f.id,
                    f."fileName",
                    f."folderId",
                    ts_rank(f."fileNameFts", q.q) AS filename_rank
                FROM "File" f, query q
                WHERE f."fileNameFts" @@ q.q
            ),
            file_from_pages AS (
                SELECT
                    pm.id,
                    pm."fileName",
                    pm."knowledgeId",
                    ARRAY_AGG(pm."pageNumber" ORDER BY pm."pageNumber") AS "pageNumbers",
                    MAX(pm.page_rank) AS best_page_rank,
                    SUM(pm.page_rank) AS total_page_rank,
                    0::float AS filename_rank
                FROM page_matches pm
                GROUP BY pm.id, pm."fileName", pm."folderId" 
            ),
            combined AS (
                SELECT
                    id,
                    "fileName",
                    "folderId",
                    MAX("pageNumbers") AS "pageNumbers",
                    MAX(best_page_rank) AS best_page_rank,
                    MAX(total_page_rank) AS total_page_rank,
                    MAX(filename_rank) AS filename_rank
                FROM (
                    SELECT * FROM file_from_pages
                    UNION ALL
                    SELECT * FROM file_from_filename
                ) t
                GROUP BY id, "fileName", "folderId"
            ),
            best_page AS (
                SELECT DISTINCT ON (pm.id)
                    pm.id,
                    pm.content,
                    pm."pageNumber",
                    pm.page_rank
                FROM page_matches pm
                ORDER BY pm.id, pm.page_rank DESC
            )

            -- FINAL
            SELECT
                c.id,
                c."fileName",
                c."folderId",
                c."pageNumbers",
                bp."pageNumber" AS "snippetPageNumber",
                ts_headline('indonesian', bp.content, q.q, 'StartSel=<mark>, StopSel=</mark>, MaxWords=25') AS snippet,

                -- (
                --   c.filename_rank * 2.0
                --   + c.best_page_rank * 1.5
                --   + c.total_page_rank * 0.5
                -- ) AS rank
                (
                    c.filename_rank * 2.0
                    + c.best_page_rank * 1.5
                    + LOG(1 + c.total_page_rank) * 0.5
                ) AS rank

            FROM combined c
            LEFT JOIN best_page bp ON bp.id = c.id
            JOIN query q ON true
            ORDER BY rank DESC
            LIMIT ${limit};
        `

        return sql
    }

    /**
     * 
     * @param q 
     */
    private async fullTextSearch(q: string, opts?: { folderLimit: number; fileLimit: number }) {
        const [folders, files] = await Promise.all([
            prisma.$queryRaw<IFolderSearchRow[]>(this.sqlCmdFolder(q, opts ? opts.folderLimit : 10)),
            prisma.$queryRaw<IFileSearchRow[]>(this.sqlCmdFile(q, opts ? opts.fileLimit : 100))
        ])

        return { folders, files }
    }

    /**
     * 
     * @param q 
     * @param limit 
     */
    private sqlCmdSuggestCorrectQuery(q: string, limit: number = 1) {
        const sql: Prisma.Sql = Prisma.sql`
            SELECT text, type, score
            FROM (
                SELECT 
                "folderName" AS text, 
                "folder" AS type,
                similarity(${q}::text, "folderName") AS score
                FROM "Folder"
                WHERE ${q}::text % "folderName"

                UNION ALL

                SELECT 
                "fileName" AS text, 
                'file' AS type,
                similarity(${q}::text, "fileName") AS score
                FROM "File"
                WHERE ${q}::text % "fileName"
            ) t
            ORDER BY score DESC
            LIMIT ${limit}
        `

        return sql
    }

    /**
     * 
     * @param q 
     */
    private async suggestCorrectedQuery(q: string, limit: number = 1): Promise<string | undefined> {
        const suggestions = await prisma.$queryRaw<ISuggestQuery[]>(this.sqlCmdSuggestCorrectQuery(q, limit))
        return suggestions.length > 0 ? suggestions[0].text : undefined
    }

    /**
     * 
     * @param c 
     * @param take 
     * @param snippetOpts 
     * @returns 
     */
    async queryLike(c: Context, take: number = 10, snippetOpts?: { start: number; end: number }) {
        const { keyword: q } = c.req.query()
        if (!q.trim()) return { folders: [], files: [] }

        const [folders, fileByNames, pages] = await Promise.all([
            prisma.folder.findMany({
                where: {
                    folderName: { contains: q, mode: 'insensitive' }
                },
                take,
                select: {
                    id: true,
                    folderName: true,
                    createdAt: true,
                }
            }),
            prisma.file.findMany({
                where: {
                    fileName: { contains: q, mode: 'insensitive' }
                },
                select: {
                    id: true,
                    fileName: true,
                    folderId: true
                }
            }),
            prisma.fileVector.findMany({
                where: {
                    content: { contains: q, mode: 'insensitive' }
                },
                select: {
                    pageNumber: true,
                    content: true,
                    file: {
                        select: {
                            id: true,
                            fileName: true,
                            folderId: true
                        }
                    }
                }
            })
        ])

        const fileMap = new Map<string, IFileSearchRow_>()
        for (const f of fileByNames) {
            fileMap.set(f.id, {
                id: f.id,
                fileName: f.fileName,
                folderId: f.folderId,
                pageNumbers: [],
                rank: 2,
            })
        }

        for (const p of pages) {
            const fileId = p.file.id
            let entry = fileMap.get(fileId)

            if (!entry) {
                entry = {
                    id: fileId,
                    folderId: p.file.folderId,
                    fileName: p.file.fileName,
                    pageNumbers: [],
                    rank: 0,
                }

                fileMap.set(fileId, entry)
            }

            entry.pageNumbers.push(p.pageNumber)
            entry.rank += 1

            if (!entry.latestPageNumber || p.pageNumber > entry.latestPageNumber) {
                entry.latestPageNumber = p.pageNumber
                if (snippetOpts && snippetOpts.end <= p.content.length && p.content.length > 0)
                    entry.snippet = snippetOpts ? p.content.slice(snippetOpts.start, snippetOpts.end) : p.content
                else entry.snippet = p.content
            }
        }

        // Normalize
        const files = Array.from(fileMap.values())
            .map((f) => ({
                id: f.id,
                folderId: f.folderId,
                fileName: f.fileName,
                pageNumbers: Array.from(new Set(f.pageNumbers)).sort((a, b) => a - b),
                snippetPageNumber: f.snippetPageNumber,
                snippet: f.snippet,
                rank: f.rank
            }))
            .sort((a, b) => b.rank - a.rank)
            .slice(0, take)

        return { folders, files }
    }

    /**
     * 
     * @param q 
     * @param limit 
     * @param threshold 
     * @returns 
     */
    private sqlCmdSuggest(q: string, limit: number = 10, threshold: number = 0.4) {
        const sql: Prisma.Sql = Prisma.sql`
            WITH _ AS (
                SELECT set_config('pg_trgm.word_similarity_threshold', ${threshold.toString()}, true)
            )
            SELECT text, type, score
            FROM (
                SELECT 
                "folderName" AS text, 
                'folder' AS type,
                word_similarity(${q}::text, "folderName") AS score
                FROM "Folder", _
                WHERE ${q}::text <% "folderName"
                
                UNION ALL

                SELECT 
                "fileName" AS text, 
                'file' AS type,
                word_similarity(${q}::text, "fileName") AS score
                FROM "File", _
                WHERE ${q}::text <% "fileName"
            ) t
            ORDER BY score DESC
            LIMIT ${limit}
        `

        return sql
    }

    /**
     * 
     * @param q 
     * @param limit 
     * @param threshold 
     */
    async suggest(c: Context, limit: number = 10, threshold: number = 0.4): Promise<{ suggestions: ISuggestQuery[] }> {
        const { keyword: q } = c.req.query()
        if (!q?.trim()) return { suggestions: [] }

        const suggestions = await prisma.$queryRaw<ISuggestQuery[]>(this.sqlCmdSuggest(q, limit, threshold))
        return { suggestions }
    }

    /**
     * 
     * @param result 
     * @returns 
     */
    private getTopScore(result: ISearchResponse): number {
        const fileScore = result.files?.[0]?.rank ?? 0
        const folderScore = result.folders?.[0]?.rank ?? 0

        return Math.max(fileScore, folderScore)
    }

    /**
     * 
     * @param q 
     * @param confident 
     * @param opts 
     * @returns 
     */
    async search(
        c: Context, confident: number = 0.5,
        opts?: { limit: number; ftsOpts?: { folderLimit: number; fileLimit: number; } }
    ): Promise<ISearchResponse> {
        const { keyword: q } = c.req.query()
        if (!q?.trim()) return { folders: [], files: [] }

        const result = await this.fullTextSearch(q, opts?.ftsOpts)
        const hasResult =
            result.files.length > 0 ||
            result.folders.length > 0

        const topScore = this.getTopScore(result)
        const isLC = !hasResult || topScore < confident

        if (hasResult && isLC) {
            const fixedQuery = await this.suggestCorrectedQuery(q, opts?.limit)
            if (fixedQuery) {
                return {
                    suggestedQuery: fixedQuery,
                    ...result
                }
            }

            return result
        }

        if (!hasResult) {
            const fixedQuery = await this.suggestCorrectedQuery(q, opts?.limit)
            if (!fixedQuery) return result

            const fixedResult = await this.fullTextSearch(q, opts?.ftsOpts)
            const fixedHasResult =
                fixedResult.files.length > 0 ||
                fixedResult.folders.length > 0

            if (fixedHasResult) {
                return {
                    searchedQuery: fixedQuery,
                    ...fixedResult
                }
            }

            return fixedResult
        }

        return result
    }
}