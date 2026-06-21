// src/jobs/reconcile-orphaned-files.ts

import plimit from 'p-limit'
import { FtpLibrary } from '../lib/ftp.js'
import { inngest } from '../lib/inngest-client.js'
import { prismaProxy } from '../lib/prisma.js'
import { env } from '../config.js'
import { homePath } from '../middleware/auth.validator.js'
import { RepositoryFolder, ISource } from '../modules/folder/folder.svc.js'

export const reconcileOrphanedFiles = inngest.createFunction(
    {
        id: 'reconcile-orphaned-files',
        name: 'Reconcile Orphaned FTP Files',
        // retries so transient FTP errors don't cause false-positive deletes
        retries: 3,
        triggers: [
            { cron: '*/10 * * * *' },
            { event: 'drive/reconcile.requested' }
        ]
    },
    async ({ step, logger }) => {
        const folderRepo = new RepositoryFolder()

        /* ────────────────────────────────────────────
         * STEP 1: load all ACTIVE file records from DB
         * ──────────────────────────────────────────── */
        const dbFiles = await step.run('load-db-files', async () => {
            return prismaProxy.file.findMany({
                where: { recordStatus: 'ACTIVE' },
                select: {
                    id: true,
                    fileName: true,
                    folderId: true,
                    source: true,
                    account: {
                        select: {
                            username: true,
                        }
                    },
                    folder: {
                        select: { source: true }
                    }
                },
            })
        })

        logger.info(`Loaded ${dbFiles.length} active DB file records`, dbFiles)

        /* ────────────────────────────────────────────
         * STEP 2: group by siteId so we open one FTP
         *         connection per site, not per file
         * ──────────────────────────────────────────── */
        type SiteGroup = {
            siteId: number
            ftpHost: string
            files: typeof dbFiles
        }

        const bySite = dbFiles.reduce<Record<string, SiteGroup>>((acc, f) => {
            const source = (f.folder?.source ?? f.source) as ISource
            const siteId = source.ftpPort!
            const ftpHost = source.ftpHost ?? env.FTP_HOST
            const key = `${ftpHost}:${siteId}`
            if (!acc[key]) acc[key] = { siteId, ftpHost, files: [] }
            acc[key].files.push(f)
            return acc
        }, {})

        /* ────────────────────────────────────────────
         * STEP 3 per-site: check each DB file exists
         *         on FTP, collect orphaned IDs
         * ──────────────────────────────────────────── */
        const orphanedDbIds: string[] = []  // in DB, missing on FTP
        const orphanedFtpPaths: { path: string; siteId: number; ftpHost: string }[] = []  // on FTP, missing in DB

        for (const { siteId, ftpHost, files } of Object.values(bySite)) {
            await step.run(`check-ftp-site-${ftpHost}:${siteId}`, async () => {
                const ftp = new FtpLibrary(siteId, ftpHost)

                // Fix #14: load the folder map once per step instead of once per file
                const folderMap = await folderRepo.loadFolderMap()

                try {
                    for (const dbFile of files) {
                        await ftp.connect()
                        const homeDir = homePath(dbFile.account.username)
                        const realPath = await folderRepo.realPath(dbFile.folderId, folderMap)
                        const workingDir = `${homeDir}/${realPath}`.replace(/\/+/g, '/')

                        // Fix #3: findFile throws when the file is missing; catch it to
                        // collect the orphan instead of crashing the step.
                        try {
                            await ftp.findFile(workingDir, dbFile.fileName)
                        } catch {
                            logger.warn(`DB file ${dbFile.id} has no FTP counterpart at ${workingDir}`)
                            orphanedDbIds.push(dbFile.id)
                        }

                        ftp.close()
                    }

                    /* ── also list FTP root and find files with no DB record ── */
                    const limit = plimit(5)
                    const realPathPromise = files.map(async (file) => limit(async () => {
                        const folderPath = await folderRepo.realPath(file.folderId, folderMap)
                        return `${folderPath}/${file.fileName}`.replace(/\/+/g, '/')
                    }))

                    const realPaths = await Promise.allSettled(realPathPromise)

                    await ftp.connect()
                    const ftpFiles = (await ftp.listAllFiles()).map(e => e.path)
                    const dbPaths = new Set(
                        realPaths
                            .filter((e): e is PromiseFulfilledResult<string> => e.status === 'fulfilled')
                            .map(e => e.value)
                    )

                    for (const ftpPath of ftpFiles) {
                        if (!dbPaths.has(ftpPath)) {
                            logger.warn(`FTP file at ${ftpPath} has no DB record`)
                            orphanedFtpPaths.push({ path: ftpPath, siteId, ftpHost })
                        }
                    }
                } finally {
                    ftp.close()
                }
            })
        }

        /* ────────────────────────────────────────────
         * STEP 4: mark orphaned DB records as DEAD
         * ──────────────────────────────────────────── */
        const deadDbCount = await step.run('mark-dead-db-records', async () => {
            if (orphanedDbIds.length === 0) return 0

            const res = await prismaProxy.file.updateMany({
                where: { id: { in: orphanedDbIds } },
                data: {
                    recordStatus: 'DEAD',    // or your equivalent tombstone status
                    updatedAt: new Date(),
                },
            })

            return res.count
        })

        /* ────────────────────────────────────────────
         * STEP 5: delete orphaned FTP files
         * ──────────────────────────────────────────── */
        const deadFtpCount = await step.run('delete-orphaned-ftp-files', async () => {
            if (orphanedFtpPaths.length === 0) return 0

            let deleted = 0
            for (const { path, siteId, ftpHost } of orphanedFtpPaths) {
                const ftp = new FtpLibrary(siteId, ftpHost)
                try {
                    await ftp.connect()
                    // Fix #4: removeFile(dir, name) — split the full path correctly
                    const lastSlash = path.lastIndexOf('/')
                    const dir  = path.substring(0, lastSlash)
                    const name = path.substring(lastSlash + 1)
                    await ftp.removeFile(dir, name)
                    deleted++
                } catch (err) {
                    logger.error(`Failed to delete orphaned FTP file at ${path}`, err)
                } finally {
                    ftp.close()
                }
            }
            return deleted
        })

        return {
            dbOrphansMarkedDead: deadDbCount,
            ftpOrphansDeleted: deadFtpCount,
        }
    }
)