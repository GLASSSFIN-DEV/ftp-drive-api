import { Hono } from 'hono'
import { mkdirSync } from 'node:fs'
import Guard from '../../middleware/auth.validator.js'
import { tusServer, TUS_UPLOAD_DIR } from './upload.svc.js'

mkdirSync(TUS_UPLOAD_DIR, { recursive: true })

const router = new Hono()

// Handle all TUS protocol methods (POST, PATCH, HEAD, DELETE, OPTIONS)
router.all('/upload/tus', Guard.validate(), async (c) => {
    return tusServer.handleWeb(c.req.raw)
})

router.all('/upload/tus/*', Guard.validate(), async (c) => {
    return tusServer.handleWeb(c.req.raw)
})

export default router
