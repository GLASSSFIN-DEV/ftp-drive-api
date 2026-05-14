import RequestValidator from '@/middleware/req.validator'
import { Hono } from 'hono'
import { RepositoryFileSharing } from '@/modules/sharing/file-sharing.svc'
import { FileSharingNewDto } from '@/dto/file-share.dto'
import { RepositoryFolderSharing } from '@/modules/sharing/folder-sharing.svc'
import { FolderSharingNewDto } from '@/dto/folder-share.dto'

const router = new Hono()
const fileSharing = new RepositoryFileSharing()
const folderSharing = new RepositoryFolderSharing

router.post('/file-sharing', RequestValidator.validate(FileSharingNewDto), async (c) => {
    const value = await fileSharing.fileSharingNew(c)
    return c.json(value)
})
router.delete('/file-sharing/:id', async (c) => {
    const value = await fileSharing.fileSharingDrop(c)
    return c.json(value)
})
router.get('/file-sharing/:id', async (c) => {
    const value = await fileSharing.get(c)
    return c.json(value)
})


router.post('/folder-sharing', RequestValidator.validate(FolderSharingNewDto), async (c) => {
    const value = await folderSharing.folderSharingNew(c)
    return c.json(value)
})
router.delete('/folder-sharing/:id', async (c) => {
    const value = await folderSharing.folderSharingDrop(c)
    return c.json(value)
})
router.get('/folder-sharing/:id', async (c) => {
    const value = await folderSharing.get(c)
    return c.json(value)
})

export default router