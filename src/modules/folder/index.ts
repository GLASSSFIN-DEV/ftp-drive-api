import RequestValidator from '@/middleware/req.validator'
import { Hono } from 'hono'
import { RepositoryFolder } from '@/modules/folder/folder.svc'
import { FileChangeDto, FileNewDto } from '@/dto/file.dto'
import AuthConsent from '@/middleware/auth.validator'

const router = new Hono()
const folderService = new RepositoryFolder()

router.post('/folder', RequestValidator.validate(FileNewDto), AuthConsent.validate(), async (c) => {
    const value = await folderService.newFolder(c)
    return c.json(value)
})
router.put('/folder/:id', RequestValidator.validate(FileChangeDto), AuthConsent.validate(), async (c) => {
    const value = await folderService.changeFolder(c)
    return c.json(value)
})
router.delete('/folder/:id', AuthConsent.validate(), async (c) => {
    const value = await folderService.removeFolder(c)
    return c.json(value)
})
router.get('/folders', AuthConsent.validate(), async (c) => {
    const value = await folderService.lists(c)
    return c.json(value)
})
router.get('/folder/:id', AuthConsent.validate(), async (c) => {
    const value = await folderService.get(c)
    return c.json(value)
})


export default router