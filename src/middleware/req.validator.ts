// src/middlewares/request-validator.middleware.ts

import { createMiddleware } from 'hono/factory'
import type { ClassConstructor } from 'class-transformer'
import { plainToInstance } from 'class-transformer'
import {
  type ValidationError,
  type ValidatorOptions,
  validate,
} from 'class-validator'

import logger from '@/lib/logger.js'
import { HttpException } from '@/common/http-exception.js'
import prismaProxy from '@/lib/prisma'
import { InputJsonObject } from '@prisma/client/runtime/client'

export default class RequestValidator {
  static validate = <T>(
    classInstance: ClassConstructor<T>
  ) => {
    return createMiddleware(async (c, next) => {
      const validationErrorText = 'Request entity not valid'

      try {
        const body = await c.req.json()
        const convertedObject = plainToInstance(classInstance, body)
        const errors = await validate(
          convertedObject as Record<string, unknown>,
          {
            whitelist: true,
            forbidNonWhitelisted: true,
          } as ValidatorOptions
        )

        if (!errors.length) {
          c.set('validatedBody', convertedObject)
          await prismaProxy.traceSpan.create({
            data: {
              traceId: c.get('traceId'),
              json: { body, convertedObject } as unknown as InputJsonObject,
              context: `[body]`,
              durationMs: 0,
            }
          })
          
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

function getAllConstraintKeys(
  jsonObject: ValidationError[]
): string[] {
  let keys: string[] = []

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