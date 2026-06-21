import { Hono } from 'hono'
import Guard from '../../middleware/auth.validator.js'
import { tusServer } from './upload.svc.js'

const router = new Hono()

// Handle all TUS protocol methods (POST, PATCH, HEAD, DELETE, OPTIONS)
router.all('/upload/tus', Guard.validate(), async (c) => {
    return tusServer.handleWeb(c.req.raw)
})

router.all('/upload/tus/*', Guard.validate(), async (c) => {
    return tusServer.handleWeb(c.req.raw)
})

export default router
