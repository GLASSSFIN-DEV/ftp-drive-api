import type { Context } from 'hono'
import { HttpException } from '@/common/http-exception.js'
import { ContentfulStatusCode } from 'hono/utils/http-status'

export const errorHandler = async (
  err: Error,
  c: Context
) => {
  if (err instanceof HttpException) {
    return c.json(
      {
        errCode: err.errCode,
        statusCode: err.statusCode,
        messages: err.messages,
        payload: err.payload,
      },
      err.statusCode as ContentfulStatusCode
    )
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