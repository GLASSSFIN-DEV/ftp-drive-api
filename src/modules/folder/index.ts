import RequestValidator from '@/middleware/req.validator'
import { Hono } from 'hono'
import { RepositoryFolder } from '@/modules/folder/folder.svc'
import { FileChangeDto, FileNewDto } from '@/dto/file.dto'

const router = new Hono()
const folderService = new RepositoryFolder()

router.post('/folder', RequestValidator.validate(FileNewDto), async (c) => {
    const value = await folderService.newFolder(c)
    return c.json(value)
})
router.put('/folder/:id', RequestValidator.validate(FileChangeDto), async (c) => {
    const value = await folderService.changeFolder(c)
    return c.json(value)
})
router.delete('/folder/:id', async (c) => {
    const value = await folderService.removeFolder(c)
    return c.json(value)
})
router.get('/folders', async (c) => {
    const value = await folderService.lists(c)
    return c.json(value)
})
router.get('/folder/:id', async (c) => {
    const value = await folderService.get(c)
    return c.json(value)
})


export default router