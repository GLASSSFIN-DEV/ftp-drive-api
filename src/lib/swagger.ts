import { getMetadataStorage } from "class-validator";
import {
  validationMetadatasToSchemas,
} from 'class-validator-jsonschema'
import { env } from "../config.js";
import { DebugFolderExistDto, SiteId } from "../dto/debug.dto.js";
import { FileSharingNewDto } from "../dto/file-share.dto.js";
import { FolderChangeDto, FolderNewDto } from "../dto/folder.dto.js";
import { FileChangeDto, FileNewDto } from "../dto/file.dto.js";
import { FolderSharingNewDto } from "../dto/folder-share.dto.js";
import { MediaDropDto, MediaStreamDto } from "../dto/media.dto.js";
import { PageQueryDto, UuidDto } from "../dto/query.dto.js";
import { RbacNewDto } from "../dto/rbac.dto.js";
import { UserChangeDto, UserNewDto } from "../dto/user.dto.js";

const schemas = validationMetadatasToSchemas({
  classValidatorMetadataStorage: getMetadataStorage(),
})

new DebugFolderExistDto()
new SiteId()
new FolderNewDto()
new FolderChangeDto()
new FileNewDto()
new FileChangeDto()
new FileSharingNewDto()
new FolderSharingNewDto()
new MediaDropDto()
new MediaStreamDto()
new PageQueryDto()
new UuidDto()
new RbacNewDto()
new UserNewDto()
new UserChangeDto()

export const definition = {
  openapi: '3.0.0',
  host: env.API_URL,
  basePath: '/api',
  externalDocs: {
    description: 'FileDrive',
    url: env.API_URL
  },
  info: {
    title: "FileDrive",
    version: "1.0.0",
    contact: {
      name: 'glasssfin.dev@gmail.com',
    }
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "apiKey",
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
    { name: "Debug", description: "Debug related endpoints" },
  ],
  paths: {
    // Auth
    '/v1/auth/users': {
      get: {
        tags: ['Auth'],
        security: [
          {
            BearerAuth: [],
          },
        ],
        summary: 'User Lists',
        responses: {
          200: {
            description: 'Success',
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
    '/v1/auth/me': {
      get: {
        tags: ['Auth'],
        security: [
          {
            BearerAuth: [],
          },
        ],
        summary: 'My Profile',
        responses: {
          200: {
            description: 'Success',
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
      get: {
        tags: ['Auth'],
        security: [
          {
            BearerAuth: [],
          },
        ],
        summary: 'Logout',
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
    '/v1/auth/refresh': {
      get: {
        tags: ['Auth'],
        security: [
          {
            BearerAuth: [],
          },
        ],
        summary: 'Refresh Token',
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
    '/v1/oauth/google': {
      get: {
        tags: ['Auth'],
        summary: 'Login OAuth with Google',
        responses: {
          200: {
            description: 'Success',
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
    '/v1/oauth/google/callback': {
      get: {
        tags: ['Auth'],
        summary: 'Callback for validate the redirect/consent provider scope',
        responses: {
          200: {
            description: 'Success',
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

    // Folder
    '/v1/folder': {
      post: {
        tags: ['Folder'],
        summary: 'Folder New',
        security: [
          {
            BearerAuth: [],
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref:
                  '#/components/schemas/FolderNewDto',
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
    '/v1/folder/{id}': {
      get: {
        tags: ['Folder'],
        summary: 'Folder Get',
        security: [
          {
            BearerAuth: [],
          },
        ],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Id",
          }
        ],
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
      post: {
        tags: ['Folder'],
        summary: 'Folder Change',
        security: [
          {
            BearerAuth: [],
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref:
                  '#/components/schemas/FolderChangeDto',
              },
            },
          },
        },
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Id",
          }
        ],
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
      delete: {
        tags: ['Folder'],
        summary: 'Folder Remove',
        security: [
          {
            BearerAuth: [],
          },
        ],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Id",
          }
        ],
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
    '/v1/folders': {
      get: {
        tags: ['Folder'],
        summary: 'Folders',
        security: [
          {
            BearerAuth: [],
          },
        ],
        parameters: [
          {
            name: "page",
            in: "query",
            required: false,
            schema: { type: "integer", default: 1 },
            description: "Page number for pagination (default: 1)",
          },
          {
            name: "pageSize",
            in: "query",
            required: false,
            schema: { type: "integer", default: 10 },
            description: "Number of items per page (default: 10, max: 500)",
          },
          {
            name: "keyword",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Search keyword to filter folders",
          },
          {
            name: "startDate",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Start date period",
          },
          {
            name: "endDate",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "End date period",
          },
        ],
        responses: {
          200: {
            description: 'Success',
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
    '/v1/my-folders': {
      get: {
        tags: ['Folder'],
        summary: 'My Folders',
        security: [
          {
            BearerAuth: [],
          },
        ],
        parameters: [
          {
            name: "parentId",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Folder parent",
          },
        ],
        responses: {
          200: {
            description: 'Success',
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
    '/v1/folder/{id}/real-path': {
      get: {
        tags: ['Folder'],
        summary: 'Folder Real Path',
        security: [
          {
            BearerAuth: [],
          },
        ],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Id",
          }
        ],
        responses: {
          200: {
            description: 'Success',
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
    
    // File
    '/v1/file/{id}': {
      get: {
        tags: ['File'],
        summary: 'File Get',
        security: [
          {
            BearerAuth: [],
          },
        ],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "File Id (UUID)",
          }
        ],
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
      put: {
        tags: ['File'],
        summary: 'File Change',
        security: [
          {
            BearerAuth: [],
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref:
                  '#/components/schemas/FileChangeDto',
              },
            },
          },
        },
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "File Id (UUID)",
          }
        ],
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
      delete: {
        tags: ['File'],
        summary: 'File Remove',
        security: [
          {
            BearerAuth: [],
          },
        ],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "File Id (UUID)",
          }
        ],
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
    '/v1/files': {
      get: {
        tags: ['File'],
        summary: 'Files',
        security: [
          {
            BearerAuth: [],
          },
        ],
        parameters: [
          {
            name: "page",
            in: "query",
            required: false,
            schema: { type: "integer", default: 1 },
            description: "Page number for pagination (default: 1)",
          },
          {
            name: "pageSize",
            in: "query",
            required: false,
            schema: { type: "integer", default: 10 },
            description: "Number of items per page (default: 10, max: 500)",
          },
          {
            name: "keyword",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Search keyword to filter files",
          },
          {
            name: "startDate",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Start date period",
          },
          {
            name: "endDate",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "End date period",
          },
        ],
        responses: {
          200: {
            description: 'Success',
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
    '/v1/my-files/{id}': {
      get: {
        tags: ['File'],
        summary: 'My Files',
        security: [
          {
            BearerAuth: [],
          },
        ],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "Folder Id (UUID) to list files from",
          }
        ],
        responses: {
          200: {
            description: 'Success',
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
    '/v1/file/version/{id}': {
      get: {
        tags: ['File'],
        summary: 'Versions of File',
        security: [
          {
            BearerAuth: [],
          },
        ],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "Folder Id (UUID) to list files from",
          }
        ],
        responses: {
          200: {
            description: 'Success',
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

    // Media
    '/v1/media/upload': {
      post: {
        tags: ['Media'],
        summary: 'Upload Multiple Files',
        description: 'Upload multiple files to FTP storage',
        security: [
          {
            BearerAuth: [],
          },
        ],
        parameters: [
          {
            name: 'site',
            in: 'query',
            required: true,
            schema: {
              type: 'integer',
              example: 1,
            },
            description: 'FTP Site ID',
          },
          {
            name: 'remotePath',
            in: 'query',
            required: true,
            schema: {
              type: 'string',
              example: '/uploads/images',
            },
            description: 'Destination remote folder path',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  files: {
                    type: 'array',
                    items: {
                      type: 'string',
                      format: 'binary',
                    },
                    description: 'Multiple files upload',
                  },
                },
                required: ['files'],
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/OkResponse',
                },
              },
            },
          },
          400: {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/FailResponse',
                },
              },
            },
          },
        },
      },
    },
    '/v1/media/upload/folder': {
      post: {
        tags: ['Media'],
        summary: 'Upload Folder',
        description: 'Upload folder recursively to FTP storage',
        security: [
          {
            BearerAuth: [],
          },
        ],
        parameters: [
          {
            name: 'site',
            in: 'query',
            required: true,
            schema: {
              type: 'integer',
              example: 1,
            },
            description: 'FTP Site ID',
          },
          {
            name: 'remotePath',
            in: 'query',
            required: true,
            schema: {
              type: 'string',
              example: '/uploads/projects',
            },
            description: 'Destination remote folder path',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  files: {
                    type: 'array',
                    items: {
                      type: 'string',
                      format: 'binary',
                    },
                    description: 'Folder files',
                  },
                  'paths[]': {
                    type: 'array',
                    items: {
                      type: 'string',
                    },
                    example: [
                      'images',
                      'images/icons',
                      'docs',
                    ],
                    description: 'Relative folder paths',
                  },
                },
                required: ['files', 'paths[]'],
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/OkResponse',
                },
              },
            },
          },
          400: {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/FailResponse',
                },
              },
            },
          },
        },
      },
    },
    '/v1/media/stream': {
      post: {
        tags: ['Media'],
        summary: 'Stream Media',
        description: 'Stream file from FTP storage',
        security: [
          {
            BearerAuth: [],
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/MediaStreamDto',
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Success',
            content: {
              '*/*': {
                schema: {
                  type: 'string',
                  format: 'binary',
                },
              },
            },
          },
          400: {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/FailResponse',
                },
              },
            },
          },
        },
      },
    },
    '/v1/media/site': {
      get: {
        tags: ['Media'],
        summary: 'Media Sites',
        security: [
          {
            BearerAuth: [],
          },
        ],
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

    // Sharing
    '/v1/sharing/file': {
      post: {
        tags: ['Sharing'],
        summary: 'Create file sharing',
        security: [
          {
            BearerAuth: [],
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/FileSharingNewDto',
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
          401: {
            description: 'Unauthorized',
          },
        },
      },
    },
    '/v1/sharing/file/{id}': {
      get: {
        tags: ['Sharing'],
        summary: 'Get file sharing detail',
        security: [
          {
            BearerAuth: [],
          },
        ],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: {
              type: 'string',
              format: 'uuid',
            },
          },
        ],
        responses: {
          200: {
            description: 'Success',
          },
          401: {
            description: 'Unauthorized',
          },
          404: {
            description: 'Not Found',
          },
        },
      },
      delete: {
        tags: ['Sharing'],
        summary: 'Delete file sharing',
        security: [
          {
            BearerAuth: [],
          },
        ],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: {
              type: 'string',
              format: 'uuid',
            },
          },
        ],
        responses: {
          200: {
            description: 'Success',
          },
          401: {
            description: 'Unauthorized',
          },
          404: {
            description: 'Not Found',
          },
        },
      },
    },
    '/v1/sharing/folder': {
      post: {
        tags: ['Sharing'],
        summary: 'Create folder sharing',
        security: [
          {
            BearerAuth: [],
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/FolderSharingNewDto',
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
          401: {
            description: 'Unauthorized',
          },
        },
      },
    },
    '/v1/sharing/folder/{id}': {
      get: {
        tags: ['Sharing'],
        summary: 'Get folder sharing detail',
        security: [
          {
            BearerAuth: [],
          },
        ],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: {
              type: 'string',
              format: 'uuid',
            },
          },
        ],
        responses: {
          200: {
            description: 'Success',
          },
          401: {
            description: 'Unauthorized',
          },
          404: {
            description: 'Not Found',
          },
        },
      },
      delete: {
        tags: ['Sharing'],
        summary: 'Delete folder sharing',
        security: [
          {
            BearerAuth: [],
          },
        ],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,

            schema: {
              type: 'string',
              format: 'uuid',
            },
          },
        ],
        responses: {
          200: {
            description: 'Success',
          },
          401: {
            description: 'Unauthorized',
          },
          404: {
            description: 'Not Found',
          },
        },
      },
    },

    // Debug
    '/v1/debug/ftp/{siteId}': {
      post: {
        tags: ['Debug'],
        summary: 'FTP Debug',
        parameters: [
          {
            in: 'path',
            name: 'siteId',
            required: true,
            schema: {
              type: 'integer',
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/DebugFolderExistDto',
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
          401: {
            description: 'Unauthorized',
          },
        },
      },
    },
    '/v1/debug/orphans': {
      get: {
        tags: ['Debug'],
        summary: 'Check Orphaned Files and Folders',
        description: 'Returns list of DB records missing on FTP and FTP entries missing in DB',
        responses: {
          200: {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    summary: {
                      type: 'object',
                      properties: {
                        dbFoldersMissingOnFtp: { type: 'integer', example: 5 },
                        ftpFoldersMissingInDb: { type: 'integer', example: 2 },
                        dbFilesMissingOnFtp: { type: 'integer', example: 10 },
                        ftpFilesMissingInDb: { type: 'integer', example: 3 },
                      },
                    },
                    orphans: {
                      type: 'object',
                      properties: {
                        dbFoldersMissingOnFtp: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: { type: 'string' },
                              folderName: { type: 'string' },
                              path: { type: 'string' },
                            },
                          },
                        },
                        ftpFoldersMissingInDb: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              path: { type: 'string' },
                              siteId: { type: 'integer' },
                            },
                          },
                        },
                        dbFilesMissingOnFtp: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: { type: 'string' },
                              fileName: { type: 'string' },
                              path: { type: 'string' },
                            },
                          },
                        },
                        ftpFilesMissingInDb: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              path: { type: 'string' },
                              siteId: { type: 'integer' },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Debug'],
        summary: 'Delete Orphaned Files and Folders',
        description: 'Marks DB orphans as DEAD and deletes FTP orphans',
        responses: {
          200: {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    deleted: {
                      type: 'object',
                      properties: {
                        dbFolders: { type: 'integer', example: 5 },
                        dbFiles: { type: 'integer', example: 10 },
                        ftpFolders: { type: 'integer', example: 2 },
                        ftpFiles: { type: 'integer', example: 3 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
}
