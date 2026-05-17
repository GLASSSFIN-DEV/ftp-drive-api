import RequestValidator from '@/middleware/req.validator'
import { Hono } from 'hono'
import { RepositoryFile } from '@/modules/file/file.svc'
import { FileChangeDto } from '@/dto/file.dto'
import AuthConsent from '@/middleware/auth.validator'

const router = new Hono()
const fileService = new RepositoryFile()

router.put('/file/:id', RequestValidator.validate(FileChangeDto), AuthConsent.validate(), async (c) => {
    const value = await fileService.changeFile(c)
    return c.json(value)
})
router.delete('/file/:id', AuthConsent.validate(), async (c) => {
    const value = await fileService.removeFile(c)
    return c.json(value)
})
router.get('/files', AuthConsent.validate(), async (c) => {
    const value = await fileService.lists(c)
    return c.json(value)
})
router.get('/file/:id', AuthConsent.validate(), async (c) => {
    const value = await fileService.get(c)
    return c.json(value)
})
router.get('/my-files/:folderId', AuthConsent.validate(), async (c) => {
    const value = await fileService.myFiles(c)
    return c.json(value)
})


export default router