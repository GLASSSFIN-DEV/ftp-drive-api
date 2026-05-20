import { FtpLibrary } from "../lib/ftp.js";
import { prismaProxy } from "../lib/prisma.js";
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

    const orphanedFiles: OrphanCheckResult = {
        dbFoldersMissingOnFtp: [],
        ftpFoldersMissingInDb: [],
        dbFilesMissingOnFtp: [],
        ftpFilesMissingInDb: []
    }

    const folderBySite = new Map<number, Array<{ folder: typeof dbFolders[0]; path: string }>>()
    
    for (const folder of dbFolders) {
        const source = folder.source as unknown as ISource
        const siteId = source?.ftpPort
        if (!siteId) continue

        const realPath = await folderRepo.realPath(folder.id)
        const homeDir = homePath(folder.account.username)
        const fullPath = `${homeDir}/${realPath}`.replace(/\/+/g, '/')

        if (!folderBySite.has(siteId)) folderBySite.set(siteId, [])
        folderBySite.get(siteId)!.push({ folder, path: fullPath })
    }

    const fileBySite = new Map<number, Array<{ file: typeof dbFiles[0]; path: string }>>()
    
    for (const file of dbFiles) {
        const source = (file.folder?.source ?? file.source) as ISource
        const siteId = source?.ftpPort
        if (!siteId) continue

        try {
            const realPath = await folderRepo.realPath(file.folderId)
            const homeDir = homePath(file.account.username)
            const fullPath = `${homeDir}/${realPath}/${file.fileName}`.replace(/\/+/g, '/')

            if (!fileBySite.has(siteId)) fileBySite.set(siteId, [])
            fileBySite.get(siteId)!.push({ file, path: fullPath })
        } catch {
            orphanedFiles.dbFilesMissingOnFtp.push({
                id: file.id,
                fileName: file.fileName,
                path: file.fileName
            })
        }
    }

    const folderEntries = Array.from(folderBySite.entries())
    for (const [siteId, folders] of folderEntries) {
        const ftp = new FtpLibrary(siteId)
        try {
            await ftp.connect()

            const dbFolderPaths = new Set<string>(folders.map(f => f.path))
            
            for (const { folder, path } of folders) {
                try {
                    await ftp.findFile(path, '.')
                } catch {
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
    for (const [siteId, files] of fileEntries) {
        const ftp = new FtpLibrary(siteId)
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