import { FtpLibrary } from "../../lib/ftp.js";
import { inngest } from "../../lib/inngest-client.js";
import { prismaProxy } from "../../lib/prisma.js";

type CompletedStep =
    | { type: 'folder'; id: string }
    | { type: 'file'; id: string }
    | { type: 'ftp'; path: string; siteId: number }

export class UploadSaga {
    private completed: CompletedStep[] = []

    track(step: CompletedStep) {
        this.completed.push(step)
    }

    async rollback(ftpLibrary: FtpLibrary) {
        // reverse order — undo last step first
        for (const step of this.completed.reverse()) {
            try {
                if (step.type === 'ftp') {
                    await ftpLibrary.removeDir(step.path)
                }
                if (step.type === 'file') {
                    await prismaProxy.file.delete({ where: { id: step.id } })
                }
                if (step.type === 'folder') {
                    await prismaProxy.folder.delete({ where: { id: step.id } })
                }
            } catch (rollbackErr) {
                console.error('Rollback step failed, scheduling reconciliation', rollbackErr)

                // fire-and-forget — Inngest queues it durably
                await inngest.send({
                    name: 'drive/reconcile.requested',
                    data: { reason: 'rollback-failure' },
                })

            }
        }
    }
}