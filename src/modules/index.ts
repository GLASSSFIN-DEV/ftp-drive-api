import { Hono } from 'hono'
import auth from './auth/index.js'
import file from './file/index.js'
import folder from './folder/index.js'
import media from './media/index.js'
import sharing from './sharing/index.js'
import db from './debug/index.js'
import upload from './upload/index.js'
import fts from './search/index.js'

const app = new Hono()

app.route('/', auth)
app.route('/', file)
app.route('/', folder)
app.route('/', media)
app.route('/', sharing)
app.route('/', db)
app.route('/', upload)
app.route('/', fts)

export default app