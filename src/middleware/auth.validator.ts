import { createMiddleware } from 'hono/factory'
import logger from '@/lib/logger.js'
import { HttpException } from '@/common/http-exception.js'
import { IAccount } from '@/types/hono'
import { StatusCodes } from 'http-status-codes'
import { verify } from 'hono/jwt'
import { env } from '@/config'
import prismaProxy from '@/lib/prisma'
import { JWTPayload } from 'hono/utils/jwt/types'

function homePath(value: string) {
  return (value || "")
    .split("@")[0]
    .replace(/[^a-zA-Z0-9]/g, "_")
}

export default class AuthConsent {
  static validate = () => {
    return createMiddleware(async (c, next) => {
      try {
        const authorization = c.req.header('Authorization')
        if (!authorization) throw new HttpException({
          errCode: 'UNAUTHORIZED',
          statusCode: StatusCodes.UNAUTHORIZED,
          messages: ['No Bearer found!'],
        })

        const token = authorization.replace(/^Bearer\s+/i, '')
        const payload = await verify(token, env.JWT_SECRET, { alg: 'HS256' }) as JWTPayload & { sub: string; role: string; }
        const user = await prismaProxy.account.findFirst({
          select: {
            id: true,
            username: true,
            email: true,
            fullname: true,
            provider: true,
            rbacId: true,
            rbac: {
              select: {
                name: true,
                value: true,
              }
            }
          },
          where: { id: payload.sub, recordStatus: 'ACTIVE' }
        })

        if (!user) throw new HttpException({
          errCode: 'UNAUTHORIZED',
          statusCode: StatusCodes.UNAUTHORIZED,
          messages: ['User is Not Active!'],
        })

        const session = await prismaProxy.session.findFirst({ where: { accountId: payload.sub, jwtHash: token, recordStatus: 'ACTIVE' } })
        if (!session) throw new HttpException({
          errCode: 'UNAUTHORIZED',
          statusCode: StatusCodes.UNAUTHORIZED,
          messages: ['Expired!'],
        })

        const iac: IAccount = {
          id: user.id,
          username: user.username,
          fullname: user.fullname,
          email: user.email,
          provider: user.provider,
          rbacId: user?.rbacId,
          rbacName: user.rbac?.name,
          rbac: user.rbac?.value,
          homePath: homePath(user.username),
        }

        c.set('account', iac)
        await next()
      } catch (e) {
        logger.error(e)

        if (e instanceof HttpException) {
          throw e
        }

        throw new HttpException({
          errCode: 'AUTH_CONSENT_ERROR',
          statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
          messages: [
            e instanceof Error
              ? e.message
              : 'Auth consent error!',
          ],
        })
      }
    })
  }
}