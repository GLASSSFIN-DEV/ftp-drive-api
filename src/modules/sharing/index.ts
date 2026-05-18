import Validate from '@/middleware/req.validator'
import { Hono } from 'hono'
import { RepositoryFileSharing } from '@/modules/sharing/file-sharing.svc'
import { FileSharingNewDto } from '@/dto/file-share.dto'
import { RepositoryFolderSharing } from '@/modules/sharing/folder-sharing.svc'
import { FolderSharingNewDto } from '@/dto/folder-share.dto'
import Guard from '@/middleware/auth.validator'
import { UuidDto } from '@/dto/query.dto'

const router = new Hono()
const fileSharing = new RepositoryFileSharing()
const folderSharing = new RepositoryFolderSharing

router.post('/sharing/file', Validate.for(FileSharingNewDto), Guard.validate(), async (c) => {
    const value = await fileSharing.fileSharingNew(c)
    return c.json(value)
})
router.delete('/sharing/file/:id', Validate.for(UuidDto, 'param'), Guard.validate(), async (c) => {
    const value = await fileSharing.fileSharingDrop(c)
    return c.json(value)
})
router.get('/sharing/file/:id', Validate.for(UuidDto, 'param'), Guard.validate(), async (c) => {
    const value = await fileSharing.get(c)
    return c.json(value)
})


router.post('/sharing/folder', Validate.for(FolderSharingNewDto), Guard.validate(), async (c) => {
    const value = await folderSharing.folderSharingNew(c)
    return c.json(value)
})
router.delete('/sharing/folder/:id', Validate.for(UuidDto, 'param'), Guard.validate(), async (c) => {
    const value = await folderSharing.folderSharingDrop(c)
    return c.json(value)
})
router.get('/sharing/folder/:id', Validate.for(UuidDto, 'param'), Guard.validate(), async (c) => {
    const value = await folderSharing.get(c)
    return c.json(value)
})

export default router