import { Hono } from 'hono'
import { FtpLibrary } from '@/lib/ftp'
import { env, Environments } from '@/config'

const router = new Hono()

router.get('/debug/ftp/:siteId{[0-9]+}', async (c) => {
    if (env.NODE_ENV === Environments.PRODUCTION) return c.redirect('/')
        
    const siteId = c.req.param('siteId')
    const ftp = new FtpLibrary(Number(siteId))
    const value = await ftp.debug()

    return c.json(value)
})

export default router