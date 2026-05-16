import { Hono } from 'hono'
import { FtpLibrary } from '@/lib/ftp'
import { env, Environments } from '@/config'
import RequestValidator from '@/middleware/req.validator'
import { DebugFolderExistDto } from '@/dto/debug.dto'

const router = new Hono()

router.post('/debug/ftp/:siteId{[0-9]+}', RequestValidator.validate(DebugFolderExistDto), async (c) => {
    if (env.NODE_ENV === Environments.PRODUCTION) return c.redirect('/')
        
    const siteId = c.req.param('siteId')
    const ftp = new FtpLibrary(Number(siteId))
    const body = c.get('validatedBody') as DebugFolderExistDto
    const value = await ftp.debug(body.remotePath)

    return c.json(value)
})

export default router