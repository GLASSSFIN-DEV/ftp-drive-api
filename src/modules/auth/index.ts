import { Hono } from 'hono'
import { Auth } from '@/modules/auth/auth.svc'
import Guard from '@/middleware/auth.validator'
import { RepositoryGOAuth } from '@/modules/auth/google.svc'

const router = new Hono()
const authService = new Auth()
const oautService = new RepositoryGOAuth()

router.get('/auth/users', Guard.validate(), async (c) => {
    const value = await authService.users(c)
    return c.json(value)
})

router.get('/auth/me', Guard.validate(), async (c) => {
    const account = c.get('account')
    return c.json(account)
})

router.get('/auth/logout', Guard.validate(), async (c) => {
    const value = await authService.logout(c)
    return c.json(value)
})

router.get('/auth/refresh', Guard.validate(), async (c) => {
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