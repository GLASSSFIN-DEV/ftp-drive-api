import { FtpLibrary } from "../lib/ftp.js";
import { prismaProxy } from "../lib/prisma.js";
import { env } from "../config.js";
import { homePath } from "../middleware/auth.validator.js";
import { RepositoryFolder, ISource } from "../modules/folder/folder.svc.js";

export interface OrphanCheckResult {
    dbFoldersMissingOnFtp: { id: string; folderName: string; path: string }[]
    ftpFoldersMissingInDb: { path: string; siteId: number }[]
    dbFilesMissingOnFtp: { id: string; fileName: string; path: string }[]
    ftpFilesMissingInDb: { path: string; siteId: number }[]
}

export async function checkOrphans(): Promise<OrphanCheckResult> {
    const folderRepo = new RepositoryFolder()

    const [dbFolders, dbFiles] = await Promise.all([
        prismaProxy.folder.findMany({
            where: { recordStatus: 'ACTIVE' },
            select: {
                id: true,
                folderName: true,
                accountId: true,
                parentId: true,
                source: true,
                account: { select: { username: true } }
            }
        }),
        prismaProxy.file.findMany({
            where: { recordStatus: 'ACTIVE' },
            select: {
                id: true,
                fileName: true,
                folderId: true,
                source: true,
                account: { select: { username: true } },
                folder: { select: { source: true } }
            }
        })
    ])

    // Fix #14: load the folder map once instead of once per realPath call
    const folderMap = await folderRepo.loadFolderMap()

    const orphanedFiles: OrphanCheckResult = {
        dbFoldersMissingOnFtp: [],
        ftpFoldersMissingInDb: [],
        dbFilesMissingOnFtp: [],
        ftpFilesMissingInDb: []
    }

    type SiteKey = string  // `${ftpHost}:${ftpPort}`
    type SiteConn = { ftpHost: string; siteId: number }

    const folderBySite = new Map<SiteKey, { conn: SiteConn; items: Array<{ folder: typeof dbFolders[0]; path: string }> }>()

    for (const folder of dbFolders) {
        const source = folder.source as unknown as ISource
        const siteId = source?.ftpPort
        if (!siteId) continue
        const ftpHost = source?.ftpHost ?? env.FTP_HOST
        const key: SiteKey = `${ftpHost}:${siteId}`

        const realPath = await folderRepo.realPath(folder.id, folderMap)
        const homeDir = homePath(folder.account.username)
        const fullPath = `${homeDir}/${realPath}`.replace(/\/+/g, '/')

        if (!folderBySite.has(key)) folderBySite.set(key, { conn: { ftpHost, siteId }, items: [] })
        folderBySite.get(key)!.items.push({ folder, path: fullPath })
    }

    const fileBySite = new Map<SiteKey, { conn: SiteConn; items: Array<{ file: typeof dbFiles[0]; path: string }> }>()

    for (const file of dbFiles) {
        const source = (file.folder?.source ?? file.source) as ISource
        const siteId = source?.ftpPort
        if (!siteId) continue
        const ftpHost = source?.ftpHost ?? env.FTP_HOST
        const key: SiteKey = `${ftpHost}:${siteId}`

        try {
            const realPath = await folderRepo.realPath(file.folderId, folderMap)
            const homeDir = homePath(file.account.username)
            const fullPath = `${homeDir}/${realPath}/${file.fileName}`.replace(/\/+/g, '/')

            if (!fileBySite.has(key)) fileBySite.set(key, { conn: { ftpHost, siteId }, items: [] })
            fileBySite.get(key)!.items.push({ file, path: fullPath })
        } catch {
            orphanedFiles.dbFilesMissingOnFtp.push({
                id: file.id,
                fileName: file.fileName,
                path: file.fileName
            })
        }
    }

    const folderEntries = Array.from(folderBySite.entries())
    for (const [, { conn: { ftpHost, siteId }, items: folders }] of folderEntries) {
        const ftp = new FtpLibrary(siteId, ftpHost)
        try {
            await ftp.connect()

            const dbFolderPaths = new Set<string>(folders.map(f => f.path))
            
            for (const { folder, path } of folders) {
                // Fix #13: use dirExists (list the directory) instead of findFile(path, '.')
                // which always threw because '.' is never returned by FTP LIST responses.
                const exists = await ftp.dirExists(path)
                if (!exists) {
                    orphanedFiles.dbFoldersMissingOnFtp.push({
                        id: folder.id,
                        folderName: folder.folderName,
                        path
                    })
                }
            }

            const allFtpEntries = await ftp.listAllFiles('/')
            const allFtpPaths = new Set<string>(allFtpEntries.map(e => e.path))
            
            for (const ftpPath of Array.from(allFtpPaths)) {
                const homePrefix = homePath('')
                if (!ftpPath.includes(homePrefix)) continue
                
                const dbPathsArray = Array.from(dbFolderPaths)
                const isDirectMatch = dbPathsArray.includes(ftpPath)
                const isSubfolder = dbPathsArray.some(dbPath => ftpPath.startsWith(dbPath + '/'))
                
                if (!isDirectMatch && !isSubfolder) {
                    const isDirectory = allFtpEntries.find(e => e.path === ftpPath)?.isDirectory
                    if (isDirectory) {
                        orphanedFiles.ftpFoldersMissingInDb.push({ path: ftpPath, siteId })
                    }
                }
            }
        } finally {
            ftp.close()
        }
    }

    const fileEntries = Array.from(fileBySite.entries())
    for (const [, { conn: { ftpHost, siteId }, items: files }] of fileEntries) {
        const ftp = new FtpLibrary(siteId, ftpHost)
        try {
            await ftp.connect()

            const dbFilePaths = new Set<string>(files.map(f => f.path))

            const allFtpEntries = await ftp.listAllFiles('/')
            const ftpFilePaths = new Set<string>(
                allFtpEntries.filter(e => !e.isDirectory).map(e => e.path)
            )

            for (const { file, path } of files) {
                if (!ftpFilePaths.has(path)) {
                    orphanedFiles.dbFilesMissingOnFtp.push({
                        id: file.id,
                        fileName: file.fileName,
                        path
                    })
                }
            }

            for (const ftpPath of Array.from(ftpFilePaths)) {
                if (!dbFilePaths.has(ftpPath)) {
                    orphanedFiles.ftpFilesMissingInDb.push({ path: ftpPath, siteId })
                }
            }
        } finally {
            ftp.close()
        }
    }

    return orphanedFiles
}