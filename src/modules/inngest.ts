// src/routes/inngest.ts
import { Hono }                   from 'hono'
import { serve }                  from 'inngest/hono'
import { inngest } from '../lib/inngest-client.js'
import { reconcileOrphanedFiles } from '../jobs/reconcile-orphaned-files.js'
import { parsePdfJob } from '../jobs/parse-pdf.js'

const inngestRoute = new Hono()

inngestRoute.on(
    ['GET', 'PUT', 'POST'],
    '/api/inngest',
    serve({
        client:    inngest,
        functions: [reconcileOrphanedFiles, parsePdfJob],
    })
)

export default inngestRoute