// src/routes/inngest.ts
import { Hono }                   from 'hono'
import { serve }                  from 'inngest/hono'
import { inngest }                from '@/lib/inngest-client'
import { reconcileOrphanedFiles } from '@/jobs/reconcile-orphaned-files'

const inngestRoute = new Hono()

// ✅ correct — serve() returns a handler, not { GET, POST, PUT }
inngestRoute.on(
    ['GET', 'PUT', 'POST'],
    '/api/inngest',
    serve({
        client:    inngest,
        functions: [reconcileOrphanedFiles],
    })
)

export default inngestRoute