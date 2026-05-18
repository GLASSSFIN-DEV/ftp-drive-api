import { Hono } from 'hono'
import { FtpLibrary } from '@/lib/ftp'
import { env, Environments } from '@/config'
import { DebugFolderExistDto } from '@/dto/debug.dto'
import Validate from '@/middleware/req.validator'
import { checkOrphans } from '@/jobs/check-orphans'
import { prismaProxy } from '@/lib/prisma'

const router = new Hono()

router.post('/debug/ftp/:siteId{[0-9]+}', Validate.for(DebugFolderExistDto, 'body'), async (c) => {
    if (env.NODE_ENV === Environments.PRODUCTION) return c.redirect('/')

    const siteId = c.req.param('siteId')
    const ftp = new FtpLibrary(Number(siteId))

    try {
        await ftp.connect()
        const body = c.get('validatedBody') as DebugFolderExistDto
        const value = await ftp.debug(body.remotePath)
        return c.json(value)
    } finally {
        ftp.close()
    }
})

router.get('/debug/orphans', async (c) => {
    if (env.NODE_ENV === Environments.PRODUCTION) return c.redirect('/')

    const orphans = await checkOrphans()
    return c.json({
        summary: {
            dbFoldersMissingOnFtp: orphans.dbFoldersMissingOnFtp.length,
            ftpFoldersMissingInDb: orphans.ftpFoldersMissingInDb.length,
            dbFilesMissingOnFtp: orphans.dbFilesMissingOnFtp.length,
            ftpFilesMissingInDb: orphans.ftpFilesMissingInDb.length,
        },
        orphans
    })
})

router.delete('/debug/orphans', async (c) => {
    if (env.NODE_ENV === Environments.PRODUCTION) return c.redirect('/')

    const orphans = await checkOrphans()

    const dbFolderIds = orphans.dbFoldersMissingOnFtp.map(f => f.id)
    const dbFileIds = orphans.dbFilesMissingOnFtp.map(f => f.id)

    await prismaProxy.$transaction(async (tx) => {
        if (dbFolderIds.length > 0) {
            await tx.folder.updateMany({
                where: { id: { in: dbFolderIds } },
                data: { recordStatus: 'DEAD' }
            })
        }
        if (dbFileIds.length > 0) {
            await tx.file.updateMany({
                where: { id: { in: dbFileIds } },
                data: { recordStatus: 'DEAD' }
            })
        }
    })

    for (const { path, siteId } of orphans.ftpFoldersMissingInDb) {
        const ftp = new FtpLibrary(siteId)
        try {
            await ftp.connect()
            await ftp.removeDir(path)
        } catch (err) {
            console.error(`Failed to delete FTP folder ${path}:`, err)
        } finally {
            ftp.close()
        }
    }

    for (const { path, siteId } of orphans.ftpFilesMissingInDb) {
        const ftp = new FtpLibrary(siteId)
        try {
            await ftp.connect()
            await ftp.removeFile(path, '')
        } catch (err) {
            console.error(`Failed to delete FTP file ${path}:`, err)
        } finally {
            ftp.close()
        }
    }

    return c.json({
        deleted: {
            dbFolders: dbFolderIds.length,
            dbFiles: dbFileIds.length,
            ftpFolders: orphans.ftpFoldersMissingInDb.length,
            ftpFiles: orphans.ftpFilesMissingInDb.length
        }
    })
})

export default router