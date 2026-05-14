import { getMetadataStorage } from "class-validator";
import { env } from '@/config';
import {
  validationMetadatasToSchemas,
} from 'class-validator-jsonschema'

const schemas = validationMetadatasToSchemas({
  classValidatorMetadataStorage: getMetadataStorage(),
})

export const definition = {
  openapi: '3.0.0',
  host: env.API_URL,
  basePath: '/api',
  externalDocs: {
    description: 'MakassarApi-FileDrive',
    url: env.API_URL
  },
  info: {
    title: "MakassarApi-FileDrive",
    version: "1.0.0",
    contact: {
      name: 'glasssfin.dev@gmail.com',
    }
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "bearer",
        in: "header",
        name: "Authorization",
        description: "Bearer Authorization",
      },
    },
    schemas: {
      ...schemas,
      OkResponse: {
        type: "object",
        properties: {
          statusCode: {
            type: "integer",
            example: 200,
          },
          messages: {
            type: "array",
            items: {
              type: "string",
            },
            example: ["Success"],
          },
          payload: {
            nullable: true,
          },
        },

        required: ["statusCode", "messages"],
      },
      FailResponse: {
        type: "object",
        properties: {
          errCode: {
            type: "string",
            example: "VALIDATION_ERROR",
          },
          statusCode: {
            type: "integer",
            example: 400,
          },
          messages: {
            type: "array",
            items: {
              type: "string",
            },
            example: ["Invalid request"],
          },
          payload: {
            nullable: true,
          },
        },

        required: ["errCode", "statusCode", "messages"],
      },
      Pagination: {
        type: "object",
        properties: {
          page: {
            type: "integer",
            example: 1,
          },
          pageSize: {
            type: "integer",
            example: 10,
          },
          totalRows: {
            type: "integer",
            example: 100,
            nullable: true,
          },
          totalPage: {
            type: "integer",
            example: 10,
            nullable: true,
          },
          currentPage: {
            type: "integer",
            example: 1,
            nullable: true,
          },
        },
        required: ["page", "pageSize"],
      },
      ItemPagination: {
        type: "object",
        properties: {
          items: {
            description:
              "Generic items container. Override in derived schemas.",
          },
          pagination: {
            $ref: "#/components/schemas/Pagination",
          },
          rbac: {
            nullable: true,
          },
        },
        required: ["items", "pagination"],
      },

    },
  },
  tags: [
    { name: "Auth", description: "Authentication related endpoints" },
    { name: "Media", description: "Media related endpoints" },
    { name: "Folder", description: "Folder related endpoints" },
    { name: "File", description: "File related endpoints" },
    { name: "Sharing", description: "Sharing related endpoints" },
  ],
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
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/OkResponse",
                },
              },
            },
          },
          400: {
            description: 'Bad Request',
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/FailResponse",
                },
              },
            },
          },
        },
      },
    },
    '/v1/auth/logout': {
      post: {
        tags: ['Auth'],
        security: [
          {
            BearerAuth: [],
          },
        ],
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
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/OkResponse",
                },
              },
            },
          },
          400: {
            description: 'Bad Request',
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/FailResponse",
                },
              },
            },
          },
        },
      },
    },
  },
}
