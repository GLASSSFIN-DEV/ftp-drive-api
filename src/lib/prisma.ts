
import { PrismaPg } from '@prisma/adapter-pg';
import { getContext } from 'hono/context-storage';
import { env, Logs } from '../config.js';
import { Prisma, PrismaClient } from '../generated/prisma/client.js';
import logger from './logger.js';

const connectionString = env.DATABASE_URL
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({
    adapter,
    errorFormat: 'pretty',
    log: [
        {
            emit: 'event',
            level: 'error',
        },
    ],
});

prisma.$on(`error`, async (e) => {
    loopLogEvent(e, 'err');
});

/**
 *
 * @param object
 * @param status
 */
const loopLogEvent = (
    object: Prisma.LogEvent,
    status: 'log' | 'err' | 'warn' | 'info' = 'log'
) => {
    for (const key in object) {
        if (Object.prototype.hasOwnProperty.call(object, key)) {
            const typedKey = key as keyof Prisma.LogEvent
            const element = object[typedKey];
            if (status === 'err')
                logger.error(`[prisma-${status}]: ${key}: ${element}`);
            if (status === 'log')
                logger.info(`[prisma-${status}]: ${key}: ${element}`);
            if (status === 'warn')
                logger.warn(`[prisma-${status}]: ${key}: ${element}`);
            if (status === 'info')
                logger.info(`[prisma-${status}]: ${key}: ${element}`);
        }
    }
};

/**
 * using prisma with context
 * so we can get the traceId safely
 */
export function prismaWithContext(ctx: { traceId?: string; }) {
    return prisma.$extends({
        name: 'requestContext',
        query: {
            $allModels: {
                async $allOperations({ model, operation, args, query }) {
                    const start = performance.now()
                    const startAt = new Date()
                    const result = await query(args)
                    const duration = performance.now() - start
                    const endAt = new Date()

                    if ([Logs.ALL, Logs.PRISMA].includes(env.LOG))
                        logger.http(`[prisma]`, { traceId: ctx.traceId, model, operation, duration, args, startAt, endAt })
                    
                    return result
                }
            }
        }
    })
}

/**
 * please overwrite prisma call
 * so i still just call export default prisma in others class
 */
export function getPrisma() {
    const context = getContext()
    if (context.get('traceId')) return prismaWithContext({ traceId: context.get('traceId') })

    return prisma
}

const prismaProxy = new Proxy(prisma, {
    get(target, prop, receiver) {
        const resolved = getPrisma()
        return Reflect.get(resolved, prop, receiver)
    }
})

export { prisma, prismaProxy }
