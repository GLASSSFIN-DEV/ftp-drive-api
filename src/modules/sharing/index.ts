import RequestValidator from '@/middleware/req.validator'
import { Hono } from 'hono'
import { RepositoryFileSharing } from '@/modules/sharing/file-sharing.svc'
import { FileSharingNewDto } from '@/dto/file-share.dto'
import { RepositoryFolderSharing } from '@/modules/sharing/folder-sharing.svc'
import { FolderSharingNewDto } from '@/dto/folder-share.dto'
import AuthConsent from '@/middleware/auth.validator'

const router = new Hono()
const fileSharing = new RepositoryFileSharing()
const folderSharing = new RepositoryFolderSharing

router.post('/file-sharing', RequestValidator.validate(FileSharingNewDto), AuthConsent.validate(), async (c) => {
    const value = await fileSharing.fileSharingNew(c)
    return c.json(value)
})
router.delete('/file-sharing/:id', AuthConsent.validate(), async (c) => {
    const value = await fileSharing.fileSharingDrop(c)
    return c.json(value)
})
router.get('/file-sharing/:id', AuthConsent.validate(), async (c) => {
    const value = await fileSharing.get(c)
    return c.json(value)
})


router.post('/folder-sharing', RequestValidator.validate(FolderSharingNewDto), AuthConsent.validate(), async (c) => {
    const value = await folderSharing.folderSharingNew(c)
    return c.json(value)
})
router.delete('/folder-sharing/:id', AuthConsent.validate(), async (c) => {
    const value = await folderSharing.folderSharingDrop(c)
    return c.json(value)
})
router.get('/folder-sharing/:id', AuthConsent.validate(), async (c) => {
    const value = await folderSharing.get(c)
    return c.json(value)
})

export default router