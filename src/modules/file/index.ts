import { Hono } from 'hono'
import { FileChangeDto } from '../../dto/file.dto.js'
import { UuidDto, PageQueryDto } from '../../dto/query.dto.js'
import Guard from '../../middleware/auth.validator.js'
import Validate from '../../middleware/req.validator.js'
import { RepositoryFile } from './file.svc.js'

const router = new Hono()
const fileService = new RepositoryFile()

router.put('/file/:id', Validate.for(UuidDto, 'param'), Validate.for(FileChangeDto), Guard.validate(), async (c) => {
    const value = await fileService.changeFile(c)
    return c.json(value)
})
router.delete('/file/:id', Validate.for(UuidDto, 'param'), Guard.validate(), async (c) => {
    const value = await fileService.removeFile(c)
    return c.json(value)
})
router.get('/files', Validate.for(PageQueryDto, 'query'), Guard.validate(), async (c) => {
    const value = await fileService.lists(c)
    return c.json(value)
})
router.get('/file/:id', Validate.for(UuidDto, 'param'), Guard.validate(), async (c) => {
    const value = await fileService.get(c)
    return c.json(value)
})
router.get('/my-files/:id', Validate.for(UuidDto, 'param'), Guard.validate(), async (c) => {
    const value = await fileService.myFiles(c)
    return c.json(value)
})


export default router