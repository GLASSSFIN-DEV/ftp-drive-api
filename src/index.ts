import 'reflect-metadata'
import { Hono } from 'hono'
import { errorHandler } from './middleware/err.handler'
import { csrf } from 'hono/csrf'
import { compress } from 'hono/compress'
import { contextStorage } from 'hono/context-storage'
import { prettyJSON } from 'hono/pretty-json'
import { secureHeaders } from 'hono/secure-headers'
import { timeout } from 'hono/timeout'
import { timing, TimingVariables } from 'hono/timing'
import { v7 } from 'uuid'
import modules from '@/modules/index'

type HonoVariable = {
  Variables: {
    traceId: string;
    timingVariable: TimingVariables
  }
}

const app = new Hono<HonoVariable>()

app.onError(errorHandler)
app.use('*', async (c, next) => {
  const traceId: string = v7()
  c.set('traceId', traceId)
  c.header('x-trace-id', traceId)

  await next()
})

// setup middlewares
app.use('*', contextStorage())
app.use('*', timing())
app.use('*', compress())
app.use('*', secureHeaders())
app.use('*', prettyJSON())
app.use('*', csrf())
app.use('*', timeout(5_000))

// setup routers, based on modules folder
app.route('/v1', modules)

export default app
