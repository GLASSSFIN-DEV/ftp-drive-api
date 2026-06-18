import type { Context } from 'hono'
import { ContentfulStatusCode } from 'hono/utils/http-status'
import { getContext } from 'hono/context-storage'
import { HttpException } from '../common/http-exception.js'
import logger from '../lib/logger.js'
import { IFailResponse } from '../types/common.js'

export function errorHandler() {
  return async (err: Error, c: Context) => {
    logger.http('[error.api]', { ...err })
    const context = getContext()
    if (err instanceof HttpException) {
      const value: IFailResponse & { metadata: unknown } = err?.metadata ? err.metadata : err
      const statusCode = value.statusCode

      return c.json({
        ...value,
        traceId: context.get('traceId')
      }, statusCode as ContentfulStatusCode)
    }

    return c.json(
      {
        traceId: context.get('traceId'),
        errCode: 'INTERNAL_SERVER_ERROR',
        statusCode: 500,
        messages: [err.message || 'Internal server error'],
      },
      500
    )
  }
}