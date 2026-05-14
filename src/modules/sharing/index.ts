import RequestValidator from '@/middleware/req.validator'
import { Hono } from 'hono'
import { RepositoryFileSharing } from '@/modules/sharing/file-sharing.svc'
import { FileSharingNewDto } from '@/dto/file-share.dto'

const router = new Hono()
const fileSharing = new RepositoryFileSharing()

router.post('/file-sharing', RequestValidator.validate(FileSharingNewDto), async (c) => {
    const value = await fileSharing.fileSharingNew(c)
    return c.json(value)
})
router.delete('/file-sharing/:id', async (c) => {
    const value = await fileSharing.fileSharingDrop(c)
    return c.json(value)
})
router.get('/folder/:id', async (c) => {
    const value = await fileSharing.get(c)
    return c.json(value)
})


export default router