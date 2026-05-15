import { LoginDto } from '@/dto/login.dto'
import RequestValidator from '@/middleware/req.validator'
import { Hono } from 'hono'
import { Auth } from '@/modules/auth/auth.svc'
import AuthConsent from '@/middleware/auth.validator'
import { RepositoryGOAuth } from '@/modules/auth/google.svc'

const router = new Hono()
const authService = new Auth()
const oautService = new RepositoryGOAuth()

router.post('/auth/login', RequestValidator.validate(LoginDto), async (c) => {
    const value = await authService.login(c)
    return c.json(value)
})

router.get('/auth/logout', AuthConsent.validate(), async (c) => {
    const value = await authService.logout(c)
    return c.json(value)
})

router.get('/auth/refresh', AuthConsent.validate(), async (c) => {
    const value = await authService.refresh(c)
    return c.json(value)
})

router.get('/oauth/google', async (c) => {
    const value = await oautService.handshake(c)
    const url = value.payload as string

    return c.redirect(url)
})

router.get('/oauth/google/callback', async (c) => {
    const value = await oautService.callback(c)
    return c.json(value)
})

export default router