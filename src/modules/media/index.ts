
import { Hono } from 'hono'
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
    const value = await mediaRepo.folderUpload(c)
    return c.json(value)
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