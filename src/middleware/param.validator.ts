import { Context, MiddlewareHandler } from 'hono'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { HttpException } from '@/common/http-exception'
import logger from '@/lib/logger'
import { getAllConstraintKeys } from './req.validator'

export function validateParams<T extends object>(
    dtoClass: new () => T
): MiddlewareHandler {
    return async (c: Context, next) => {
        try {
            const params = c.req.param()
            const dto = plainToInstance(dtoClass, params)
            const errors = await validate(dto, {
                whitelist: true,
                forbidNonWhitelisted: true,
            })

            logger.http(`[body]`, { dto, errors })
            if (!errors.length) {
                c.set('validatedParams', dto)
                await next()
                return
            }

            const rawErrors = getAllConstraintKeys(errors)
            logger.error(rawErrors)

            throw new HttpException({
                errCode: 'VALIDATION_ERROR',
                statusCode: 422,
                messages: rawErrors,
            })
        } catch (e) {
            logger.error(e)

            if (e instanceof HttpException) {
                throw e
            }

            throw new HttpException({
                errCode: 'BAD_REQUEST',
                statusCode: 400,
                messages: [
                    e instanceof Error
                        ? e.message
                        : 'Params not match requirement',
                ],
            })
        }
    }
}