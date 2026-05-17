
import { Hono } from 'hono'
import { FtpLibrary } from '@/lib/ftp'
import { HttpException } from '@/common/http-exception'
import { StatusCodes } from 'http-status-codes'
import RequestValidator from '@/middleware/req.validator'
import { MediaStreamDto, UploadParam } from '@/dto/media.dto'
import AuthConsent from '@/middleware/auth.validator'
import { RepositoryMedia } from './media.svc'
import { validateParams } from '@/middleware/param.validator'

const router = new Hono()
const mediaRepo = new RepositoryMedia()

router.post('/media/upload', validateParams(UploadParam), AuthConsent.validate(), async (c) => {
    const value = await mediaRepo.fileUpload(c)
    return c.json(value)
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
        return await ftpLibrary.ensureDir(remotePath)
    })

    const pathMap = new Map(relativePaths.map((item, i) => [i, item]))
    const promise = files.map(async (file, i) => {
        const buffer = await file.arrayBuffer()
        const path = pathMap.get(i)
        const remotePath = (remoteBase + '/' + path).replace(/\/+/g, '/')
        const res = await ftpLibrary.uploadFile(remotePath, { buffer, fileName: file.name })

        return { upload: res, file }
    })

    const dirs = await Promise.all(ensureDirs)
    const res = await Promise.all(promise)
    return c.json({ res, dirs })
})

router.post('/media/stream', RequestValidator.validate(MediaStreamDto), AuthConsent.validate(), async (c) => {
    const value = await mediaRepo.stream(c)
    return value
})

router.get('/media/site', AuthConsent.validate(), async (c) => {
    const value = await mediaRepo.site(c)
    return c.json(value)
})

export default router