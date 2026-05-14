import { LoginDto } from '@/dto/login.dto'
import RequestValidator from '@/middleware/req.validator'
import { Hono } from 'hono'
import { Auth } from '@/modules/auth/auth.svc'
import AuthConsent from '@/middleware/auth.validator'

const router = new Hono()
const authService = new Auth()

router.post('/auth/login', RequestValidator.validate(LoginDto), async (c) => {
    const value = await authService.login(c)
    return c.json(value)
})

router.post('/auth/logout', AuthConsent.validate(), async (c) => {
    const value = await authService.logout(c)
    return c.json(value)
})

export default router