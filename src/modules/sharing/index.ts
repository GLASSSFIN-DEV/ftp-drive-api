import { Hono } from 'hono'
import { FileSharingNewDto } from '../../dto/file-share.dto.js'
import { FolderSharingNewDto } from '../../dto/folder-share.dto.js'
import { UuidDto } from '../../dto/query.dto.js'
import Guard from '../../middleware/auth.validator.js'
import Validate from '../../middleware/req.validator.js'
import { RepositoryFileSharing } from './file-sharing.svc.js'
import { RepositoryFolderSharing } from './folder-sharing.svc.js'

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