import type { Context } from 'hono'
import { HttpException } from '@/common/http-exception.js'
import logger from '@/lib/logger'
import { IFailResponse } from '@/types/common'
import { ContentfulStatusCode } from 'hono/utils/http-status'

export function errorHandler() {
  return async (err: Error, c: Context) => {
    logger.http('[error.api]', { ...err })
    if (err instanceof HttpException) {
      const value: IFailResponse & { metadata: unknown } = err?.metadata ? err.metadata : err
      const statusCode = value.statusCode
      return c.json({ ...value }, statusCode as ContentfulStatusCode)
    }

    return c.json(
      {
        errCode: 'INTERNAL_SERVER_ERROR',
        statusCode: 500,
        messages: ['Internal server error'],
      },
      500
    )
  }
}