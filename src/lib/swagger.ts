import 'reflect-metadata'

import {
  validationMetadatasToSchemas,
} from 'class-validator-jsonschema'
import { SwaggerUIOptions } from '@hono/swagger-ui'

const schemas = validationMetadatasToSchemas()

export const openAPIDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Hono API',
    version: '1.0.0',
  },

  components: {
    schemas,
  },

  paths: {
    '/v1/auth/login': {
      post: {
        tags: ['Auth'],

        summary: 'Login',

        requestBody: {
          required: true,

          content: {
            'application/json': {
              schema: {
                $ref:
                  '#/components/schemas/LoginDto',
              },
            },
          },
        },

        responses: {
          200: {
            description: 'Success',
          },

          400: {
            description: 'Bad Request',
          },
        },
      },
    },
  },
}