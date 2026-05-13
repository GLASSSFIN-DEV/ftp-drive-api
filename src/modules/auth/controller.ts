import { LoginDto } from '@/dto/login.dto'
import RequestValidator from '@/middleware/req.validator'
import { Hono } from 'hono'
import { Auth } from '@/modules/auth/auth.svc'

const router = new Hono()
const authService = new Auth()

router.post('/auth/login', RequestValidator.validate(LoginDto), async (c) => {
    const value = await authService.login(c)
    return c.json(value)
})

router.post('/auth/logout', async (c) => {
    const value = await authService.logout(c)
    return c.json(value)
})

export default router