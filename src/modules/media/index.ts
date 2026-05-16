
import { Hono } from 'hono'
import { FtpLibrary } from '@/lib/ftp'
import { HttpException } from '@/common/http-exception'
import { StatusCodes } from 'http-status-codes'
import RequestValidator from '@/middleware/req.validator'
import { MediaDropDto, MediaStreamDto } from '@/dto/media.dto'
import { lookup } from 'mime-types'
import AuthConsent from '@/middleware/auth.validator'
import { prismaProxy } from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'
import { IOkResponse } from '@/types/common'

const router = new Hono()

router.post('/media/upload', AuthConsent.validate(), async (c) => {
    const account = c.get('account')
    const homePath = account.homePath

    const body = await c.req.parseBody()
    const file = body['file']
    const site = c.req.query('site')
    const remotePath = c.req.query('remotePath')

    if (!file || typeof file === "string") throw new HttpException({
        errCode: 'EMPTY_FILE',
        statusCode: StatusCodes.NOT_FOUND,
        messages: ['No file found!']
    })

    if (!remotePath) throw new HttpException({
        errCode: 'REMOTE_PATH_FAIL',
        statusCode: StatusCodes.NOT_IMPLEMENTED,
        messages: ['Please ensure your remote path!']
    })

    const ftpLibrary = new FtpLibrary(Number(site))
    const buffer = await file.arrayBuffer()
    const res = await ftpLibrary.uploadFile(remotePath, { buffer, fileName: file.name })

    return c.json({ ...res.payload })
})

router.post('/media/uploads', AuthConsent.validate(), async (c) => {
    const account = c.get('account')
    const homePath = account.homePath

    const body = await c.req.parseBody({ all: true })
    const rawFiles = body['files']
    const site = c.req.query('site')
    const remotePath = c.req.query('remotePath')
    const files: File[] = (Array.isArray(rawFiles) ? rawFiles : [rawFiles]).filter(
        (f): f is File => !!f && typeof f !== "string"
    );

    if (files.length === 0) throw new HttpException({
        errCode: 'EMPTY_FILE',
        statusCode: StatusCodes.NOT_FOUND,
        messages: ['No file found!']
    })

    if (!remotePath) throw new HttpException({
        errCode: 'REMOTE_PATH_FAIL',
        statusCode: StatusCodes.NOT_IMPLEMENTED,
        messages: ['Please ensure your remote path!']
    })

    const ftpLibrary = new FtpLibrary(Number(site))
    const promise = files.map(async (file) => {
        const buffer = await file.arrayBuffer()
        const res = await ftpLibrary.uploadFile(remotePath, { buffer, fileName: file.name })
        return { upload: res.payload, file }
    })

    const res = await Promise.all(promise)
    return c.json(res)
})

router.post('/media/upload/folder', AuthConsent.validate(), async (c) => {
    const account = c.get('account')
    const homePath = account.homePath

    const body = await c.req.parseBody({ all: true })
    const rawFiles = body['files']
    const rawPaths = body['paths[]']
    const site = c.req.query('site')
    const remoteBase = c.req.query('remotePath')

    const files: File[] = (Array.isArray(rawFiles) ? rawFiles : [rawFiles]).filter(
        (f): f is File => !!f && typeof f !== "string"
    );

    const relativePaths: string[] = (Array.isArray(rawPaths) ? rawPaths : [rawPaths]).filter(
        (p): p is string => typeof p === "string" && p.length > 0
    );

    if (files.length === 0) throw new HttpException({
        errCode: 'EMPTY_FILE',
        statusCode: StatusCodes.NOT_FOUND,
        messages: ['No file found!']
    })

    if (relativePaths.length !== files.length) throw new HttpException({
        errCode: 'RELATIVE_PATH_NOT_SYNCUP',
        statusCode: StatusCodes.NOT_FOUND,
        messages: [`"paths[]" count (${relativePaths.length}) must match "files" count (${files.length})`]
    })

    if (!remoteBase) throw new HttpException({
        errCode: 'REMOTE_PATH_FAIL',
        statusCode: StatusCodes.NOT_IMPLEMENTED,
        messages: ['Please ensure your remote path!']
    })

    const ftpLibrary = new FtpLibrary(Number(site))
    const ensureDirs = relativePaths.map(async (e) => {
        const remotePath = (remoteBase + '/' + e).replace(/\/+/g, '/')
        return await ftpLibrary.folderExist(remotePath)
    })

    const pathMap = new Map(relativePaths.map((item, i) => [i, item]))
    const promise = files.map(async (file, i) => {
        const buffer = await file.arrayBuffer()
        const path = pathMap.get(i)
        const remotePath = (remoteBase + '/' + path).replace(/\/+/g, '/')
        const res = await ftpLibrary.uploadFile(remotePath, { buffer, fileName: file.name })

        return { upload: res.payload, file }
    })

    const dirs = await Promise.all(ensureDirs)
    const res = await Promise.all(promise)
    return c.json({ res, dirs })
})

router.post('/media/drop', RequestValidator.validate(MediaDropDto), AuthConsent.validate(), async (c) => {
    const account = c.get('account')
    const homePath = account.homePath

    const body = c.get('validatedBody') as MediaDropDto
    const ftpLibrary = new FtpLibrary()
    const res = await ftpLibrary.removeFile(body.remotePath, body.fileName)

    return c.json(res)
})

router.post('/media/stream', RequestValidator.validate(MediaStreamDto), AuthConsent.validate(), async (c) => {
    const body = c.get('validatedBody') as MediaStreamDto
    const ftpLibrary = new FtpLibrary()
    const res = await ftpLibrary.streamFile(body.remotePath, body.fileName)
    const mimeType = lookup(body.fileName)
    const headers: Record<string, string> = {
        "Content-Type": mimeType as string ?? 'application/octet-stream',
        "Content-Disposition": `inline; filename="${body.fileName}"`,
        "Cache-Control": "no-store",
    }

    return new Response(res.stream, { status: StatusCodes.OK, headers })
})

router.get('/media/site', AuthConsent.validate(), async (c) => {
    const sites = await prismaProxy.option.findFirst({
        select: { key: true, json: true },
        where: {
            key: 'ftp-site',
            json: { not: Prisma.AnyNull }
        }
    })

    const value = sites?.json as { [key: string]: { port: number; dir: string; } }
    return c.json(value)
})

export default router