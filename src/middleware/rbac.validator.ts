import { createMiddleware } from 'hono/factory'
import { HttpException } from '../common/http-exception.js'
import { IAccount } from '../types/hono.js'
import logger from '../lib/logger.js'

export default class PrivilegeValidator {
  static validate = (roles: string[]) => {
    return createMiddleware(async (c, next) => {
      try {
        const account = c.get('account') as IAccount
        if (!account.rbac) {
          throw new HttpException({
            errCode: 'ROLE_NOT_FOUND',
            statusCode: 403,
            messages: [
              'No role was assigned to your account',
            ],
          })
        }

        if (!account.rbacName) {
          throw new HttpException({
            errCode: 'ROLE_NOT_FOUND',
            statusCode: 403,
            messages: [
              'No role was assigned to your account',
            ],
          })
        }

        const valid = roles.includes(account.rbacName)
        if (!valid) {
          throw new HttpException({
            errCode: 'FORBIDDEN_ROLE',
            statusCode: 403,
            messages: ['Bad role'],
          })
        }

        await next()
      } catch (e) {
        logger.error(e)

        if (e instanceof HttpException) {
          throw e
        }

        throw new HttpException({
          errCode: 'PRIVILEGE_VALIDATION_ERROR',
          statusCode: 500,
          messages: [
            e instanceof Error
              ? e.message
              : 'Privilege validation error',
          ],
        })
      }
    })
  }
}