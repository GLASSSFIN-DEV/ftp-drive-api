// src/jobs/reconcile-orphaned-files.ts

import { inngest } from '@/lib/inngest-client'
import { FtpLibrary } from '@/lib/ftp'
import { prismaProxy } from '@/lib/prisma'
import { ISource, RepositoryFolder } from '@/modules/folder/folder.svc'
import { homePath } from '@/middleware/auth.validator'

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
            files: typeof dbFiles
        }

        const bySite = dbFiles.reduce<Record<number, SiteGroup>>((acc, f) => {
            const source = (f.folder?.source ?? f.source) as ISource
            const siteId = source.ftpPort!
            if (!acc[siteId]) acc[siteId] = { siteId, files: [] }
            acc[siteId].files.push(f)
            return acc
        }, {})

        /* ────────────────────────────────────────────
         * STEP 3 per-site: check each DB file exists
         *         on FTP, collect orphaned IDs
         * ──────────────────────────────────────────── */
        const orphanedDbIds: string[] = []  // in DB, missing on FTP
        const orphanedFtpPaths: { path: string; siteId: number }[] = []  // on FTP, missing in DB

        for (const { siteId, files } of Object.values(bySite)) {
            await step.run(`check-ftp-site-${siteId}`, async () => {
                const ftp = new FtpLibrary(siteId)

                try {
                    for (const dbFile of files) {

                        // get truthly path based on folderId
                        const homeDir = homePath(dbFile.account.username)
                        const realPath = await folderRepo.realPath(dbFile.folderId)
                        const workingDir = `${homeDir}/${realPath}`
                        const exists = await ftp.findFile(workingDir, dbFile.fileName)

                        if (!exists) {
                            logger.warn(`DB file ${dbFile.id} has no FTP counterpart at ${workingDir}`)
                            orphanedDbIds.push(dbFile.id)
                        }
                    }

                    /* ── also list FTP root and find files with no DB record ── */
                    const realPathPromise = files.map(async (file) => {
                        const folderPath = await folderRepo.realPath(file.folderId)
                        return `${folderPath}/${file.fileName}`.replace(/\/+/g, '/')  // ← append fileName
                    })

                    const realPaths = await Promise.allSettled(realPathPromise)
                    const ftpFiles = (await ftp.listAllFiles()).map(e => e.path)   // returns string[] of full paths
                    const dbPaths = new Set(
                        realPaths
                            .filter((e): e is PromiseFulfilledResult<string> => e.status === 'fulfilled')  // ← type guard
                            .map(e => e.value)   // ← extract the actual string value
                    )
                    
                    for (const ftpPath of ftpFiles) {
                        if (!dbPaths.has(ftpPath)) {
                            logger.warn(`FTP file at ${ftpPath} has no DB record`)
                            orphanedFtpPaths.push({ path: ftpPath, siteId })
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
            for (const { path, siteId } of orphanedFtpPaths) {
                const ftp = new FtpLibrary(siteId)
                try {
                    await ftp.removeFile(path, 'file-tobe')
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