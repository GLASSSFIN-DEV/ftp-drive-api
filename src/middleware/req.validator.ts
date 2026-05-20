import { createMiddleware } from 'hono/factory'
import type { ClassConstructor } from 'class-transformer'
import { plainToInstance } from 'class-transformer'
import {
  type ValidationError,
  type ValidatorOptions,
  validate,
} from 'class-validator'
import logger from '../lib/logger.js'
import { HttpException } from '../common/http-exception.js'

const validatorOpts: ValidatorOptions = {
  whitelist: true,
  forbidNonWhitelisted: true,
  enableDebugMessages: true,
}

export default class Validate {
  /**
   * 
   * @param classInstance 
   * @param entity 
   * @param isArray 
   * @returns 
   */
  static for = <T>(
    classInstance: ClassConstructor<T>,
    entity: 'body' | 'param' | 'query' = 'body',
    isArray: boolean = false,
  ) => {
    return createMiddleware(async (c, next) => {
      const validationErrorText = 'Request entity not valid'
      try {
        let errors: ValidationError[] = []
        const body = entity === 'param'
          ? c.req.param() : entity === 'query'
            ? c.req.queries() : await c.req.json()

        const convertedObject = plainToInstance(classInstance, body, {
          enableImplicitConversion: true,
          exposeDefaultValues: true,
        })

        if (isArray) {
          if (!Array.isArray(convertedObject)) throw new HttpException({
            errCode: 'VALIDATION_ERROR',
            statusCode: 422,
            messages: ['Your request is expected array!'],
          })

          for (const obj of convertedObject) {
            const e = await validate(obj, validatorOpts)
            errors = errors.concat(e)
          }
        } else {
          errors = await validate(convertedObject as Record<string, unknown>, validatorOpts)
        }

        logger.http(`[${entity}]`, { body, convertedObject, errors })
        if (!errors.length) {
          c.set('validatedBody', convertedObject)

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
              : validationErrorText,
          ],
        })
      }
    })
  }
}

/**
 * 
 * @param jsonObject 
 * @returns 
 */
function getAllConstraintKeys(jsonObject: ValidationError[]): string[] {
  let keys: string[] = []

  /**
   * 
   * @param obj 
   */
  function traverse(obj: ValidationError[]) {
    obj.forEach((item) => {
      if (item.constraints) {
        for (const key in item.constraints) {
          if (
            Object.prototype.hasOwnProperty.call(
              item.constraints,
              key
            )
          ) {
            const msg = `${item.constraints[key]}`
            keys = keys.concat(msg)
          }
        }
      }

      if (
        item.children &&
        item.children.length > 0
      ) {
        traverse(item.children)
      }
    })
  }

  traverse(jsonObject)
  keys = [...new Set(keys)]
  return keys
}