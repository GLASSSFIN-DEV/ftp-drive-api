import RequestValidator from '@/middleware/req.validator'
import { Hono } from 'hono'
import { RepositoryFile } from '@/modules/file/file.svc'
import { FileChangeDto, FileNewDto } from '@/dto/file.dto'

const router = new Hono()
const fileService = new RepositoryFile()

router.post('/file', RequestValidator.validate(FileNewDto), async (c) => {
    const value = await fileService.newFile(c)
    return c.json(value)
})
router.put('/file/:id', RequestValidator.validate(FileChangeDto), async (c) => {
    const value = await fileService.changeFile(c)
    return c.json(value)
})
router.delete('/file/:id', async (c) => {
    const value = await fileService.removeFile(c)
    return c.json(value)
})
router.get('/files', async (c) => {
    const value = await fileService.lists(c)
    return c.json(value)
})
router.get('/file/:id', async (c) => {
    const value = await fileService.get(c)
    return c.json(value)
})


export default router