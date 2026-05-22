import 'reflect-metadata'
import { Hono } from 'hono'
import { contextStorage } from 'hono/context-storage'
import { prettyJSON } from 'hono/pretty-json'
import { secureHeaders } from 'hono/secure-headers'
import { TimingVariables } from 'hono/timing'
import { v7 } from 'uuid'
import { swaggerUI } from '@hono/swagger-ui'
import { cors } from 'hono/cors'
import { definition } from './lib/swagger.js'
import { errorHandler } from './middleware/err.handler.js'
import { useTelemetry } from './middleware/logger.middleware.js'
import modules from './modules/index.js'
import inngestRoute from './modules/inngest.js'

type HonoVariable = {
  Variables: {
    traceId: string;
    timingVariable: TimingVariables
  }
}

const app = new Hono<HonoVariable>()

app.onError(errorHandler())
app.use('*', contextStorage())
app.get('/docs', swaggerUI({ url: '/docs/openapi.json' }))
app.get('/docs/openapi.json', (c) => {
  return c.json(definition)
})

app.use('*', async (c, next) => {
  const traceId: string = v7()
  c.set('traceId', traceId)
  c.header('x-trace-id', traceId)

  await next()
})

// setup middlewares
app.use('*', cors())
app.use('*', useTelemetry());
app.use('*', secureHeaders())
app.use('*', prettyJSON())

// setup routers, based on modules folder
app.route('/v1', modules)
app.route('/v1', inngestRoute)

export default app
