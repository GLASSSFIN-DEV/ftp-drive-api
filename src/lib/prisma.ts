
import { PrismaPg } from '@prisma/adapter-pg';
import { env, Environments } from '@/config'
import { Prisma, PrismaClient } from '@/generated/prisma/client';
import logger from './logger';
import { getContext } from 'hono/context-storage';

const connectionString = env.DATABASE_URL
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({
    adapter,
    errorFormat: 'pretty',
    log: [
        {
            emit: 'event',
            level: 'query',
        },
        {
            emit: 'event',
            level: 'error',
        },
        {
            emit: 'event',
            level: 'info',
        },
        {
            emit: 'event',
            level: 'warn',
        },
    ],
});

prisma.$on(`query`, async (e) => {
    if (env.NODE_ENV === Environments.PRODUCTION) loopQueryEventProd(e)
    else loopQueryEvent(e);
});
prisma.$on(`info`, async (e) => {
    loopLogEvent(e, 'info');
});
prisma.$on(`error`, async (e) => {
    loopLogEvent(e, 'err');
});
prisma.$on(`warn`, async (e) => {
    loopLogEvent(e, 'warn');
});

/**
 *
 * @param object
 */
const loopQueryEvent = (object: Prisma.QueryEvent) => {
    for (const key in object) {
        if (Object.prototype.hasOwnProperty.call(object, key)) {
            const typedKey = key as keyof Prisma.QueryEvent
            const element = object[typedKey];
            if (key === 'duration' && Number(element) > 500) logger.warn(`[🐢 slow prisma query]: ${key}: ${element}`);
            else logger.info(`[prisma-query]: ${key}: ${element}`);
        }
    }
};

/**
 *
 * @param object
 */
const loopQueryEventProd = (object: Prisma.QueryEvent) => {
    const { params, ...rest } = object
    for (const key in rest) {
        if (Object.prototype.hasOwnProperty.call(rest, key)) {
            const typedKey = key as keyof Prisma.QueryEvent
            const element = object[typedKey];
            if (key === 'duration' && Number(element) > 500) logger.warn(`[🐢 slow prisma query]: ${key}: ${element}`);
            else logger.info(`[prisma-query]: ${key}: ${element}`);
        }
    }
}

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

export default prismaProxy;
