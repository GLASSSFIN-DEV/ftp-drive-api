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
import { MediaDropDto, MediaFolderUpload, MediaStreamDto } from "../dto/media.dto.js";
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
new MediaFolderUpload()
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
      FolderSearchResult: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
          folderName: { type: 'string', example: 'Laporan Keuangan' },
          parentId: { type: 'integer', nullable: true, example: null },
          createdAt: { type: 'string', format: 'date-time' },
          rank: { type: 'number', format: 'float', example: 0.75 },
        },
        required: ['id', 'folderName', 'createdAt', 'rank'],
      },
      FileSearchResult: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901' },
          fileName: { type: 'string', example: 'laporan-q1-2024.pdf' },
          folderId: { type: 'string', format: 'uuid', example: 'c3d4e5f6-a7b8-9012-cdef-123456789012' },
          pageNumbers: {
            type: 'array',
            items: { type: 'integer' },
            example: [1, 3, 7],
            description: 'All pages where the keyword was found',
          },
          snippetPageNumber: { type: 'integer', nullable: true, example: 3, description: 'Page of the highest-ranked snippet' },
          snippet: { type: 'string', nullable: true, example: 'Lorem <mark>laporan</mark> keuangan sit amet', description: 'HTML snippet with highlighted keywords' },
          rank: { type: 'number', format: 'float', example: 1.25 },
        },
        required: ['id', 'fileName', 'folderId', 'pageNumbers', 'rank'],
      },
      FtsSearchResponse: {
        type: 'object',
        properties: {
          suggestedQuery: { type: 'string', nullable: true, example: 'laporan keuangan', description: 'Alternate query suggested when top result confidence is low' },
          searchedQuery: { type: 'string', nullable: true, example: 'laporan keuangan', description: 'Corrected query actually used when original returned no results' },
          folders: {
            type: 'array',
            items: { $ref: '#/components/schemas/FolderSearchResult' },
          },
          files: {
            type: 'array',
            items: { $ref: '#/components/schemas/FileSearchResult' },
          },
        },
        required: ['folders', 'files'],
      },
      FtsSuggestItem: {
        type: 'object',
        properties: {
          text: { type: 'string', example: 'Laporan Keuangan 2024' },
          type: { type: 'string', enum: ['folder', 'file'], example: 'file' },
          score: { type: 'number', format: 'float', example: 0.6, description: 'Word-similarity score (0–1)' },
        },
        required: ['text', 'type', 'score'],
      },
      FtsSuggestResponse: {
        type: 'object',
        properties: {
          suggestions: {
            type: 'array',
            items: { $ref: '#/components/schemas/FtsSuggestItem' },
          },
        },
        required: ['suggestions'],
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
    { name: "FTS", description: "Full-text search related endpoints" },
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
        summary: 'Create Folder',
        description: 'Creates the FTP directory first, then persists the DB record. If the DB write fails, the orphaned FTP directory will be cleaned up by the reconciler.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/FolderNewDto' },
            },
          },
        },
        responses: {
          201: {
            description: 'Folder created',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/OkResponse' },
                    {
                      type: 'object',
                      properties: {
                        payload: {
                          type: 'object',
                          properties: {
                            remotePath: { type: 'string', example: '/home/user/myFolder' },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          400: {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FailResponse' },
              },
            },
          },
          404: {
            description: 'Parent folder not found (PARENT_NOT_FOUND)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FailResponse' },
              },
            },
          },
          409: {
            description: 'Conflict — folder name already exists (FOLDER_EXISTS)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FailResponse' },
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
        summary: 'Rename / Move Folder',
        description: 'Renames or moves a folder. The FTP rename is performed first; the DB update is rolled back automatically if it fails.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/FolderChangeDto' },
            },
          },
        },
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Folder UUID',
          },
        ],
        responses: {
          201: {
            description: 'Folder renamed / moved successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/OkResponse' },
                    {
                      type: 'object',
                      properties: {
                        payload: {
                          type: 'object',
                          properties: {
                            lastWorkDir: { type: 'string', example: '/home/user/old-name' },
                            newWorkDir:  { type: 'string', example: '/home/user/new-name' },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          400: {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FailResponse' },
              },
            },
          },
          404: {
            description: 'Folder or parent not found (FOLDER_NOT_FOUND / PARENT_NOT_FOUND)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FailResponse' },
              },
            },
          },
          409: {
            description: 'Conflict — a folder with that name already exists (FOLDER_EXIST)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FailResponse' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Folder'],
        summary: 'Delete Folder',
        description: 'Deletes a folder and all nested files/folders. DB records are removed first; if the subsequent FTP directory removal fails, the orphan reconciler will clean it up.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Folder UUID',
          },
        ],
        responses: {
          200: {
            description: 'Folder and all nested content deleted',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/OkResponse' },
              },
            },
          },
          404: {
            description: 'Folder not found (FOLDER_NOT_FOUND / SOURCE_NOT_FOUND)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FailResponse' },
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
        summary: 'Rename / Move File',
        description: 'Renames or moves a file. The FTP rename is performed first; if the subsequent DB update fails the rename is automatically rolled back.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/FileChangeDto' },
            },
          },
        },
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'File Id (UUID)',
          },
        ],
        responses: {
          201: {
            description: 'File renamed successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/OkResponse' },
                    {
                      type: 'object',
                      properties: {
                        payload: {
                          type: 'object',
                          properties: {
                            lastWorkDir: { type: 'string', example: '/home/user/docs' },
                            newWorkDir:  { type: 'string', example: '/home/user/archive' },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          400: {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FailResponse' },
              },
            },
          },
          404: {
            description: 'File or folder not found (FILE_NOT_FOUND / FOLDER_NOT_FOUND)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FailResponse' },
              },
            },
          },
          409: {
            description: 'Conflict — a file with that name already exists (FILE_EXIST)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FailResponse' },
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
    '/v1/media/upload/{id}': {
      post: {
        tags: ['Media'],
        summary: 'Upload Files to Folder',
        description: 'Upload one or more files into a specific folder (identified by its UUID). Each file gets its own FTP connection — concurrent uploads are safe.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Target folder UUID',
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
                    items: { type: 'string', format: 'binary' },
                    description: 'One or more files to upload',
                  },
                },
                required: ['files'],
              },
            },
          },
        },
        responses: {
          200: {
            description: 'All files uploaded successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/OkResponse' },
                    {
                      type: 'object',
                      properties: {
                        payload: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              remotePath: { type: 'string', example: '/myFolder/sub' },
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          400: {
            description: 'Bad Request — e.g. EMPTY_FILE (no files provided)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FailResponse' },
              },
            },
          },
          404: {
            description: 'Folder not found (FOLDER_NOT_FOUND)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FailResponse' },
              },
            },
          },
          500: {
            description: 'FTP connection error (FTP_CONNECT_ISSUE)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FailResponse' },
              },
            },
          },
        },
      },
    },
    '/v1/media/upload/folder': {
      post: {
        tags: ['Media'],
        summary: 'Upload Folder Tree',
        description: 'Upload a folder tree preserving its relative path structure. Provide matching `files` and `paths[]` arrays. When uploading to the root home directory, `siteId` is required.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'folderId',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'uuid' },
            description: 'UUID of the target parent folder. When omitted, files are placed in the user\'s home directory and `siteId` is required.',
          },
          {
            name: 'siteId',
            in: 'query',
            required: false,
            schema: { type: 'integer', example: 990 },
            description: 'FTP site port. Required when `folderId` is not provided.',
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
                    items: { type: 'string', format: 'binary' },
                    description: 'Files to upload — must be the same count as `paths[]`',
                  },
                  'paths[]': {
                    type: 'array',
                    items: { type: 'string' },
                    example: ['myFolder/report.pdf', 'myFolder/images/logo.png'],
                    description: 'Relative path for each file (including filename). Count must match `files`.',
                  },
                },
                required: ['files', 'paths[]'],
              },
            },
          },
        },
        responses: {
          200: {
            description: 'All files uploaded and DB records created/updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/OkResponse' },
              },
            },
          },
          400: {
            description: 'Bad Request — possible errCodes: EMPTY_FILE, SITE_ID_REQUIRED, RELATIVE_PATH_NOT_SYNCUP, NO_ROOT_FOLDER',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FailResponse' },
              },
            },
          },
          500: {
            description: 'FTP connection error (FTP_CONNECT_ISSUE)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FailResponse' },
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
    // FTS
    '/v1/fts/search': {
      get: {
        tags: ['FTS'],
        summary: 'Full-Text Search',
        description: 'Runs a PostgreSQL full-text search (Indonesian language) across folders and file contents. When results have a low confidence score the response includes a `suggestedQuery`. When there are no results at all the engine attempts query correction and retries, returning `searchedQuery` with the corrected results.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'keyword',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: 'Search keyword. Returns empty arrays when omitted or blank.',
          },
          {
            name: 'page',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 1 },
            description: 'Page number (default: 1)',
          },
          {
            name: 'pageSize',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 25 },
            description: 'Items per page (default: 25)',
          },
        ],
        responses: {
          200: {
            description: 'Search results. `suggestedQuery` is present when confidence is low; `searchedQuery` is present when the original query returned nothing and was auto-corrected.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FtsSearchResponse' },
              },
            },
          },
          400: {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FailResponse' },
              },
            },
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FailResponse' },
              },
            },
          },
        },
      },
    },
    '/v1/fts/query-like': {
      get: {
        tags: ['FTS'],
        summary: 'LIKE Search',
        description: 'Case-insensitive LIKE search across folder names, file names, and parsed file content (FileVector). Matches are merged and ranked: file-name matches score 2, additional content-page hits each add 1. Returns up to 10 results by default.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'keyword',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: 'Search keyword. Returns empty arrays when omitted or blank.',
          },
          {
            name: 'page',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 1 },
            description: 'Page number (default: 1)',
          },
          {
            name: 'pageSize',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 25 },
            description: 'Items per page (default: 25)',
          },
        ],
        responses: {
          200: {
            description: 'LIKE search results',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    folders: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          folderName: { type: 'string', example: 'Laporan 2024' },
                          createdAt: { type: 'string', format: 'date-time' },
                        },
                        required: ['id', 'folderName', 'createdAt'],
                      },
                    },
                    files: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/FileSearchResult' },
                    },
                  },
                  required: ['folders', 'files'],
                },
              },
            },
          },
          400: {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FailResponse' },
              },
            },
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FailResponse' },
              },
            },
          },
        },
      },
    },
    '/v1/fts/suggest': {
      get: {
        tags: ['FTS'],
        summary: 'Search Suggestions',
        description: 'Returns autocomplete-style suggestions based on PostgreSQL trigram word-similarity (`<%` operator) against folder names and file names. The default similarity threshold is 0.4 and up to 10 suggestions are returned.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'keyword',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: 'Partial keyword to get suggestions for. Returns empty array when omitted or blank.',
          },
          {
            name: 'page',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 1 },
            description: 'Page number (default: 1)',
          },
          {
            name: 'pageSize',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 25 },
            description: 'Items per page (default: 25)',
          },
        ],
        responses: {
          200: {
            description: 'List of suggestions ordered by word-similarity score descending',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FtsSuggestResponse' },
              },
            },
          },
          400: {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FailResponse' },
              },
            },
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FailResponse' },
              },
            },
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
