import prismaProxy from "@/lib/prisma";
import { getContext } from "hono/context-storage";
import { MiddlewareHandler } from "hono/types";

export function useTelemetry(): MiddlewareHandler {
  return async (c, next) => {
    const startTime = Date.now();
    await next();

    // Non-blocking: fire and forget via microtask
    // so the response is already sent before we log
    queueMicrotask(async () => {
      try {
        const context = getContext()
        const data = {
            id: context.get('traceId'),
            method: c.req.method,
            url: c.req.url,
            status: c.res.status,
            responseTimeMs: Date.now() - startTime,
            createdAt: new Date(),
            accountId: context.get('account')?.id
        };

        await prismaProxy.trace.create({ data })
      } catch (error) {
        // never throw from logging
        console.error(`[ERR] Get error when using telemetry`, error)
      }
    });
  };
}