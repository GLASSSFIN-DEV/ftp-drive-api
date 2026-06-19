import 'reflect-metadata'
import { createAdaptorServer } from '@hono/node-server'
import { mkdirSync } from 'node:fs'
import app from './index.js'
import { tusServer } from './lib/tus.js'
import { env } from './config.js'
import logger from './lib/logger.js'

// Ensure tus temp directory exists
const TUS_UPLOAD_DIR = process.env.TUS_UPLOAD_DIR ?? './tus-temp'
mkdirSync(TUS_UPLOAD_DIR, { recursive: true })

// Create Node.js HTTP server backed by the Hono app
const server = createAdaptorServer({ fetch: app.fetch })

// Intercept requests: TUS path → tus-server, everything else → Hono
const [honoListener] = server.listeners('request') as ((...args: unknown[]) => void)[]
server.removeAllListeners('request')

server.on('request', (req, res) => {
    const r = req as import('http').IncomingMessage
    const s = res as import('http').ServerResponse
    const url = r.url ?? ''

    if (url === '/v1/upload/tus' || url.startsWith('/v1/upload/tus/')) {
        // TUS requests bypass Hono — add CORS headers manually
        s.setHeader('Access-Control-Allow-Origin', '*')
        s.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, HEAD, DELETE, OPTIONS')
        s.setHeader('Access-Control-Allow-Headers',
            'Authorization, Content-Type, Upload-Length, Upload-Offset, Tus-Resumable, Upload-Metadata, Upload-Defer-Length, Upload-Concat, X-HTTP-Method-Override')
        s.setHeader('Access-Control-Expose-Headers',
            'Location, Upload-Offset, Tus-Version, Tus-Resumable, Tus-Max-Size, Tus-Extension, Upload-Metadata, Upload-Defer-Length, Upload-Concat, Upload-Length')
        s.setHeader('Access-Control-Max-Age', '86400')

        if (r.method === 'OPTIONS') {
            s.writeHead(204)
            s.end()
            return
        }

        tusServer.handle(r, s)
    } else {
        honoListener(req, res)
    }
})

server.listen(env.PORT, () => {
    logger.info(`🚀  Server ready on port ${env.PORT}`)
})

export default app
