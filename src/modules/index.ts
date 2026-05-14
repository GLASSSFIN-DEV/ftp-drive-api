import { Hono } from 'hono'
import auth from '@/modules/auth'
import file from '@/modules/file'
import folder from '@/modules/folder'

const app = new Hono()

app.route('/', auth)
app.route('/', file)
app.route('/', folder)

export default app