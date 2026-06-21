import { Server as TusServer } from '@tus/server'
import { getContext } from 'hono/context-storage'
import { lookup } from 'mime-types'
import { env } from '../../config.js'
import { prismaProxy } from '../../lib/prisma.js'
import { FtpLibrary } from '../../lib/ftp.js'
import { FtpDataStore, TUS_FTP_TEMP_DIR, resolveFtpPath } from '../../lib/ftp-data-store.js'
import logger from '../../lib/logger.js'
import { RepositoryFolder } from '../folder/folder.svc.js'
import type { ISource } from '../folder/folder.svc.js'
import { UploadSaga } from '../media/upload-saga.js'

const folderRepo = new RepositoryFolder()
const ftpDataStore = new FtpDataStore()

export const tusServer = new TusServer({
    path: '/v1/upload/tus',
    datastore: ftpDataStore,

    onUploadCreate: async (_req, upload) => {
        const account = getContext().get('account')
        if (!account) throw { status_code: 401, body: 'Unauthorized' }

        const { folderId, relativePath, siteId } = upload.metadata ?? {}

        if (!siteId) throw { status_code: 400, body: 'Missing required metadata: siteId' }

        if (!relativePath) {
            if (!folderId) throw { status_code: 400, body: 'Missing required metadata: folderId' }
            const folder = await prismaProxy.folder.findFirst({ where: { id: folderId } })
            if (!folder) throw { status_code: 400, body: 'Folder not found' }
        } else if (folderId) {
            const folder = await prismaProxy.folder.findFirst({ where: { id: folderId } })
            if (!folder) throw { status_code: 400, body: 'Parent folder not found' }
        }

        return {}
    },

    onUploadFinish: async (_req, upload) => {
        const account = getContext().get('account')
        if (!account) throw { status_code: 401, body: 'Upload session expired' }

        const { fileName, folderId, siteId, fileType, relativePath, ftpHost: metaHost } = upload.metadata ?? {}

        if (!fileName || !siteId) {
            throw { status_code: 400, body: 'Missing required metadata: fileName, siteId' }
        }

        const tempPath = resolveFtpPath(`${TUS_FTP_TEMP_DIR}/${upload.id}`)
        const mimeType = fileType || lookup(fileName) || 'application/octet-stream'
        const fileSize = upload.size ?? 0
        const ftpSiteId = Number(siteId)
        const ftpHost = metaHost ?? env.FTP_HOST

        if (relativePath) {
            await handleFolderFileUpload({
                account, tempPath, fileName,
                folderId: folderId || undefined,
                siteId: ftpSiteId, ftpHost, mimeType, fileSize, relativePath,
            })
        } else {
            if (!folderId) throw { status_code: 400, body: 'Missing required metadata: folderId' }
            await handleSingleFileUpload({
                account, tempPath, fileName,
                folderId, siteId: ftpSiteId, ftpHost, mimeType, fileSize,
            })
        }

        // remove() deletes the temp FTP file (if still there) and the DB record
        await ftpDataStore.remove(upload.id).catch((e: Error) =>
            logger.warn(`[tus] cleanup failed for ${upload.id}: ${e.message}`)
        )

        return {}
    },
})

// ── Single file upload ────────────────────────────────────────────────────────

async function handleSingleFileUpload(opts: {
    account: { id: string; username: string; homePath: string }
    tempPath: string; fileName: string; folderId: string
    siteId: number; ftpHost: string; mimeType: string; fileSize: number
}) {
    const { account, tempPath, fileName, folderId, siteId, ftpHost, mimeType, fileSize } = opts

    const folderPath = await folderRepo.realPath(folderId)
    const workingDir = `${account.homePath}/${folderPath}`.replace(/\/+/g, '/')

    const ftpRead = new FtpLibrary(siteId, ftpHost)
    const ftpWrite = new FtpLibrary(siteId, ftpHost)
    try {
        await Promise.all([ftpRead.connect(), ftpWrite.connect()])
        const lastSlash = tempPath.lastIndexOf('/')
        const buffer = await ftpRead.downloadStream(
            tempPath.substring(0, lastSlash),
            tempPath.substring(lastSlash + 1),
        )
        await ftpWrite.uploadFile(workingDir, { buffer, fileName })
        logger.info(`[tus] file done: ${workingDir}/${fileName}`)
    } finally {
        ftpWrite.close()
        // ftpRead closes itself when the download stream ends or errors
    }

    try {
        await prismaProxy.file.upsert({
            where: { folderId_fileName: { folderId, fileName } },
            create: {
                fileName, folderId, accountId: account.id, fileSize, fileType: mimeType,
                source: { ftpHost, ftpPort: siteId, remotePath: workingDir } as any,
                recordStatus: 'ACTIVE',
            },
            update: { fileSize, fileType: mimeType, updatedAt: new Date() },
        })
    } catch (dbErr) {
        logger.error('[tus] DB upsert failed', dbErr)
    }
}

// ── Folder file upload ────────────────────────────────────────────────────────

async function handleFolderFileUpload(opts: {
    account: { id: string; username: string; homePath: string }
    tempPath: string; fileName: string; folderId: string | undefined
    siteId: number; ftpHost: string; mimeType: string; fileSize: number; relativePath: string
}) {
    const { account, tempPath, fileName, folderId, siteId, ftpHost: metaFtpHost, mimeType, fileSize, relativePath } = opts

    let workingDir: string
    let rootFolder: { id: string; name: string } | undefined
    let source: ISource

    if (folderId) {
        const folder = await prismaProxy.folder.findFirst({ where: { id: folderId } })
        if (!folder) throw { status_code: 400, body: 'Parent folder not found' }
        const folderPath = await folderRepo.realPath(folder.id)
        workingDir = `${account.homePath}/${folderPath}`.replace(/\/+/g, '/')
        source = folder.source as ISource
        rootFolder = { id: folder.id, name: folder.folderName }
    } else {
        workingDir = account.homePath
        source = { ftpHost: metaFtpHost, ftpPort: siteId, remotePath: account.homePath }
    }
    // source.ftpHost might be overridden by the folder's stored host; resolve effective host
    const ftpHost = source.ftpHost ?? metaFtpHost

    const workingDirSegments = workingDir
        .replace(/\/+/g, '/').replace(/^\/|\/$/g, '').split('/').filter(Boolean)
    const fullPath = `${workingDir}/${relativePath}`.replace(/\/+/g, '/')
    const parts = fullPath.replace(/^\//, '').split('/')
    parts.pop()
    const segments = parts.slice(workingDirSegments.length)

    const ftpPath = segments.length > 0
        ? `${workingDir}/${segments.join('/')}`.replace(/\/+/g, '/')
        : workingDir

    const saga = new UploadSaga()
    const leafFolder = segments.length > 0
        ? await folderRepo.createFolderChain(segments, rootFolder?.id, account.id, source, saga)
        : rootFolder ?? (() => { throw { status_code: 400, body: 'folderId required when file has no subfolder path' } })()

    logger.info(`[tus] folder file: ${ftpPath}/${fileName}`)

    const ftpRead = new FtpLibrary(siteId, ftpHost)
    const ftpWrite = new FtpLibrary(siteId, ftpHost)
    try {
        await Promise.all([ftpRead.connect(), ftpWrite.connect()])
        const lastSlash = tempPath.lastIndexOf('/')
        const buffer = await ftpRead.downloadStream(
            tempPath.substring(0, lastSlash),
            tempPath.substring(lastSlash + 1),
        )
        await ftpWrite.uploadFile(ftpPath, { buffer, fileName })
        saga.track({ type: 'ftp', dirPath: ftpPath, fileName, siteId, ftpHost })
    } catch (err) {
        await saga.rollback()
        throw err
    } finally {
        ftpWrite.close()
        // ftpRead closes itself when the download stream ends or errors
    }

    try {
        await prismaProxy.file.upsert({
            where: { folderId_fileName: { folderId: leafFolder.id, fileName } },
            create: {
                fileName, folderId: leafFolder.id, accountId: account.id, fileSize, fileType: mimeType,
                source: { ...source, remotePath: ftpPath } as any,
                recordStatus: 'ACTIVE',
            },
            update: { fileSize, fileType: mimeType, updatedAt: new Date() },
        })
    } catch (dbErr) {
        logger.error('[tus] DB upsert failed (folder)', dbErr)
    }
}
