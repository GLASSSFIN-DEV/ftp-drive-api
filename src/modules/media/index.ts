
import { Hono } from 'hono'
import { MediaFolderUpload, MediaStreamDto } from '../../dto/media.dto.js'
import { UuidDto } from '../../dto/query.dto.js'
import Guard from '../../middleware/auth.validator.js'
import Validate from '../../middleware/req.validator.js'
import { RepositoryMedia } from './media.svc.js'

const router = new Hono()
const mediaRepo = new RepositoryMedia()

router.post('/media/upload/folder', Validate.for(MediaFolderUpload, 'query'), Guard.validate(), async (c) => {
    const value = await mediaRepo.folderUpload(c)
    return c.json(value)
})

router.post('/media/upload/:id', Validate.for(UuidDto, 'param'), Guard.validate(), async (c) => {
    console.debug(`/media/upload/:file`)
    const value = await mediaRepo.fileUpload(c)
    return c.json(value)
})

router.post('/media/stream', Validate.for(MediaStreamDto), Guard.validate(), async (c) => {
    const value = await mediaRepo.stream(c)
    return value
})

router.get('/media/site', Guard.validate(), async (c) => {
    const value = await mediaRepo.site(c)
    return c.json(value)
})

export default router