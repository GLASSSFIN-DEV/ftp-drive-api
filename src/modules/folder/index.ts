import RequestValidator from '@/middleware/req.validator'
import { Hono } from 'hono'
import { RepositoryFolder } from '@/modules/folder/folder.svc'
import AuthConsent from '@/middleware/auth.validator'
import { FolderChangeDto, FolderIdDto, FolderNewDto } from '@/dto/folder.dto'
import { validateParams } from '@/middleware/param.validator'

const router = new Hono()
const folderService = new RepositoryFolder()

router.post('/folder', RequestValidator.validate(FolderNewDto), AuthConsent.validate(), async (c) => {
    const value = await folderService.newFolder(c)
    return c.json(value)
})
router.put('/folder/:id', validateParams(FolderIdDto), RequestValidator.validate(FolderChangeDto), AuthConsent.validate(), async (c) => {
    const value = await folderService.changeFolder(c)
    return c.json(value)
})
router.delete('/folder/:id', validateParams(FolderIdDto), AuthConsent.validate(), async (c) => {
    const value = await folderService.removeFolder(c)
    return c.json(value)
})
router.get('/folders', AuthConsent.validate(), async (c) => {
    const value = await folderService.lists(c)
    return c.json(value)
})
router.get('/folder/:id', validateParams(FolderIdDto), AuthConsent.validate(), async (c) => {
    const value = await folderService.get(c)
    return c.json(value)
})
router.get('/folder/:id/real-path', validateParams(FolderIdDto), AuthConsent.validate(), async (c) => {
    const value = await folderService.realPath(c.req.param('id'))
    return c.json(value)
})
router.get('/my-folders', AuthConsent.validate(), async (c) => {
    const value = await folderService.myFolders(c)
    return c.json(value)
})


export default router