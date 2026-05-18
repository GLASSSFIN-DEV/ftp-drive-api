import { Hono } from 'hono'
import { RepositoryFolder } from '@/modules/folder/folder.svc'
import Guard from '@/middleware/auth.validator'
import { FolderChangeDto, FolderNewDto } from '@/dto/folder.dto'
import Validate from '@/middleware/req.validator'
import { PageQueryDto, UuidDto } from '@/dto/query.dto'

const router = new Hono()
const folderService = new RepositoryFolder()

router.post('/folder', Validate.for(FolderNewDto), Guard.validate(), async (c) => {
    const value = await folderService.newFolder(c)
    return c.json(value)
})
router.put('/folder/:id', Validate.for(UuidDto, 'param'), Validate.for(FolderChangeDto), Guard.validate(), async (c) => {
    const value = await folderService.changeFolder(c)
    return c.json(value)
})
router.delete('/folder/:id', Validate.for(UuidDto, 'param'), Guard.validate(), async (c) => {
    const value = await folderService.removeFolder(c)
    return c.json(value)
})
router.get('/folders', Validate.for(PageQueryDto, 'query'), Guard.validate(), async (c) => {
    const value = await folderService.lists(c)
    return c.json(value)
})
router.get('/folder/:id', Validate.for(UuidDto, 'param'), Guard.validate(), async (c) => {
    const value = await folderService.get(c)
    return c.json(value)
})
router.get('/folder/:id/real-path', Validate.for(UuidDto, 'param'), Guard.validate(), async (c) => {
    const value = await folderService.realPath(c.req.param('id'))
    return c.json(value)
})
router.get('/my-folders', Guard.validate(), async (c) => {
    const value = await folderService.myFolders(c)
    return c.json(value)
})


export default router