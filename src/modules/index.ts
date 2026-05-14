import { Hono } from 'hono'
import auth from '@/modules/auth'
import file from '@/modules/file'
import folder from '@/modules/folder'
import media from '@/modules/media'
import fileSharing from '@/modules/sharing'

const app = new Hono()

app.route('/', auth)
app.route('/', file)
app.route('/', folder)
app.route('/', media)
app.route('/', fileSharing)

export default app