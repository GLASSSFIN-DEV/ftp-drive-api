# FileDrive API

A multi-site FTP drive REST API built with **Hono** (TypeScript), backed by **PostgreSQL** (Prisma) and `basic-ftp` for storage. Authentication is handled via **Google OAuth 2.0** — no passwords. Background reconciliation runs via **Inngest**.

---

## System Architecture

```mermaid
graph TD
    Client([Client / Browser])

    subgraph API ["Hono API  (Vercel)"]
        MW[Middlewares\nAuth · CORS · Telemetry · SecureHeaders]
        RT[Routers\nAuth · Folder · File · Media · Sharing · Debug]
        SW[Swagger UI  /docs]
    end

    subgraph Storage
        PG[(PostgreSQL\nschema: drive)]
        FTP1[(FTP Site A\nport 990)]
        FTP2[(FTP Site B\nport 991)]
    end

    subgraph BG ["Background  (Inngest)"]
        REC[reconcile-orphaned-files\nevery 10 min]
    end

    Google[Google OAuth 2.0]

    Client -->|Bearer JWT| MW
    MW --> RT
    Client -->|/docs| SW
    RT --> PG
    RT --> FTP1
    RT --> FTP2
    RT -->|drive/reconcile.requested| BG
    BG --> PG
    BG --> FTP1
    BG --> FTP2
    RT -->|OAuth handshake| Google
    Google -->|callback + code| RT
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ |
| Framework | Hono |
| ORM | Prisma (PostgreSQL, schema `drive`) |
| Storage | FTP over implicit TLS (`basic-ftp`) |
| Auth | Google OAuth 2.0 + JWT (HS256) |
| Background Jobs | Inngest |
| Deploy | Vercel |
| API Docs | Swagger UI at `/docs` |

---

## Core Concepts

### Multi-site FTP
Multiple FTP servers are supported, each identified by its **port number** (`siteId`). Available sites are registered in the `Option` table under key `ftp-site`. Every `Folder` and `File` record stores its FTP origin in a `source` JSON column (`ftpHost`, `ftpPort`, `remotePath`).

### User Home Directory
Each account's FTP root is derived from its username — the local part before `@` with non-alphanumeric characters replaced by `_`.

```
john.doe@company.com  →  john_doe/
```

All FTP operations are scoped under this home directory. Files are never accessible outside of it.

### Folder Hierarchy
Folders form a tree via `parentId`. `realPath(folderId)` walks up the tree to reconstruct the full FTP path:

```
homePath + realPath(folderId) + "/" + fileName
```

Example: `john_doe/reports/2025/q1/budget.xlsx`

### Upload Saga (Folder Tree)
Folder-tree uploads use a saga pattern — each completed step (FTP upload, DB folder creation, DB file upsert) is recorded. If any step fails, all completed steps are undone in reverse order. If the rollback itself fails, an `drive/reconcile.requested` Inngest event is fired so the reconciler cleans up the remainder.

### FTP ↔ DB Consistency Rules

| Operation | FTP first | DB first | Reason |
|---|---|---|---|
| Create folder | ✓ | | Orphan FTP dirs are detectable; orphan DB records are not |
| Rename folder / file | ✓ | | FTP rename rolled back if DB write fails |
| Delete folder | | ✓ | Orphan FTP dirs are cleaned by reconciler |
| Delete file | | ✓ | Orphan FTP files are cleaned by reconciler |

---

## Setup

### Environment Variables

```env
PORT=9000
NODE_ENV=development          # development | production | staging | test

# Database
DATABASE_URL=postgres://user:password@host:5432/db?schema=public

# FTP
FTP_HOST=ftp.example.com
FTP_USERNAME=ftpuser
FTP_PASSWORD=secret
FTP_CONFIG=implicit           # true | false | implicit

NODE_REJECT_UNAUTHORIZE=false

# Auth
JWT_SECRET=your-jwt-secret
JWT_EXPIRE=30m
E_SALT=your-encryption-salt

# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
GOOGLE_REDIRECT_URL=https://your-api.com/v1/oauth/google/callback

# App
API_URL=https://your-api.com
LOG=none                      # none | all | prisma | ftp
```

### Local Development

```bash
npm install
npm run dev
# API: http://localhost:9000
# Docs: http://localhost:9000/docs
```

### Database

```bash
npx prisma db push       # apply schema to DB
npx prisma generate      # regenerate Prisma client
```

### Deploy (Vercel)

```bash
npm install
vercel deploy
```

---

## Authentication Flow

```mermaid
sequenceDiagram
    actor User
    participant Client
    participant API as FileDrive API
    participant Google as Google OAuth 2.0
    participant DB as PostgreSQL

    User->>Client: click "Login with Google"
    Client->>API: GET /v1/oauth/google
    API-->>Client: 302 redirect to Google consent screen
    Client->>Google: user consents
    Google-->>Client: redirect to /v1/oauth/google/callback?code=xxx
    Client->>API: GET /v1/oauth/google/callback?code=xxx
    API->>Google: exchange code → access_token
    Google-->>API: access_token + id_token
    API->>Google: GET userinfo (email, name)
    Google-->>API: { email, name, picture }
    API->>DB: upsert Account (username = email prefix)
    DB-->>API: Account record
    API->>DB: create Session (jwtHash)
    API-->>Client: 200 { token: JWT, account }
    Client->>API: subsequent requests with Authorization: Bearer <JWT>
```

---

## File Upload Flow

```mermaid
sequenceDiagram
    actor User
    participant Client
    participant API as POST /v1/media/upload/:id
    participant DB as PostgreSQL
    participant FTP as FTP Server

    User->>Client: select files
    Client->>API: multipart/form-data  files[] + folder UUID (path param)
    API->>DB: findFirst Folder by id
    DB-->>API: Folder + source.ftpPort
    API->>DB: realPath(folderId) — build full FTP path
    DB-->>API: e.g. /reports/2025

    loop per file (p-limit 10, isolated FtpLibrary each)
        API->>FTP: connect()
        API->>FTP: ensureDir(workingDir)
        API->>FTP: uploadFrom(readableStream, fileName)
        FTP-->>API: ok
        API->>FTP: close()
    end

    loop per uploaded file (p-limit 3)
        API->>DB: file.upsert (folderId, fileName, fileSize, fileType, source)
        DB-->>API: File record
    end

    API-->>Client: 200 { payload: [{ remotePath }] }
```

---

## Folder Tree Upload Flow (Upload Saga)

```mermaid
flowchart TD
    Start([POST /v1/media/upload/folder]) --> ParseBody[Parse files + paths\[\] from body]
    ParseBody --> Validate{paths\[\].length\n== files.length?}
    Validate -- No --> E400[400 RELATIVE_PATH_NOT_SYNCUP]
    Validate -- Yes --> ResolveSite[Resolve workingDir + siteId\nfrom folderId or query siteId]
    ResolveSite --> SiteCheck{siteId valid?}
    SiteCheck -- No --> E400b[400 SITE_ID_REQUIRED]
    SiteCheck -- Yes --> Connect[ftpLibrary.connect — one connection]
    Connect --> Loop

    subgraph Loop ["For each file in items (sequential)"]
        ChainDB[createFolderChain — upsert DB folders\nfor each path segment]
        ChainDB --> TrackFolder[saga.track folder steps]
        TrackFolder --> FTPUpload[ftpLibrary.uploadFile\nensureDir + uploadFrom]
        FTPUpload --> TrackFTP[saga.track ftp step\ndirPath + fileName + siteId]
        TrackFTP --> FileUpsert[prisma.file.upsert]
        FileUpsert --> TrackFile[saga.track file step\nif newly created]
    end

    Loop -->|all ok| Done[200 { payload: FileRecord\[\] }]
    Loop -->|any error| Rollback

    subgraph Rollback ["saga.rollback — reverse order"]
        R1[ftp step → removeFile\ndirPath + fileName]
        R2[file step → prisma.file.delete]
        R3[folder step → prisma.folder.delete]
        R1 --> R2 --> R3
        RFail[rollback step fails] --> Inngest[inngest.send\ndrive/reconcile.requested]
    end

    Rollback --> Throw[re-throw original error]
```

---

## Rename / Move File or Folder

```mermaid
flowchart TD
    Start([PUT /v1/file/:id\nor PUT /v1/folder/:id]) --> Load[Load existing record from DB]
    Load --> Checks[Validate: owner, new parent exists,\nname not already taken]
    Checks --> ComputePaths[Compute lastWorkDir + newWorkDir]
    ComputePaths --> FTPRename[FTP rename\nlastWorkDir → newWorkDir]
    FTPRename -- success --> DBTx[DB transaction\nupdate record + create FileHistory]
    DBTx -- success --> Done[201 { lastWorkDir, newWorkDir }]
    DBTx -- fail --> RollbackFTP[FTP rename back\nnewWorkDir → lastWorkDir]
    RollbackFTP --> Throw[re-throw DB error]
    FTPRename -- fail --> ThrowFTP[throw FTP error\nDB unchanged]

    note1[/"XMD5 hash computed on the\nEXISTING file BEFORE rename"/]
    ComputePaths -.-> note1
```

---

## Create / Delete Folder

```mermaid
flowchart LR
    subgraph Create ["POST /v1/folder  (Create)"]
        C1[Validate name unique\nunder parent] --> C2[FTP ensureDir\ncreate directory first]
        C2 -->|FTP ok| C3[DB transaction\nFolder.create]
        C3 -->|DB fail| C4[orphan FTP dir\n→ reconciler cleans it]
        C3 -->|DB ok| C5[201 remotePath]
    end

    subgraph Delete ["DELETE /v1/folder/:id  (Delete)"]
        D1[getNestedFolders\nrecurse children] --> D2[DB transaction\ndelete sharings + files + folders]
        D2 -->|DB ok| D3[FTP removeDir\ndelete directory tree]
        D3 -->|FTP fail| D4[orphan FTP dir\n→ reconciler cleans it]
        D3 -->|FTP ok| D5[200 ok]
    end
```

---

## Orphan Reconciliation (Background Job)

```mermaid
flowchart TD
    Trigger([Inngest trigger\nevery 10 min\nor drive/reconcile.requested]) --> Step1

    Step1[Step 1: load all ACTIVE\nFile records from DB] --> Step2
    Step2[Step 2: group files\nby FTP siteId] --> Step3

    subgraph Step3 ["Step 3: per site — check each DB file on FTP"]
        S3a[loadFolderMap — one query] --> S3b
        S3b[For each DB file:\nrealPath + findFile on FTP]
        S3b -->|findFile throws| S3c[add to orphanedDbIds]
        S3b -->|found| S3d[ok]
        S3b --> S3e[listAllFiles on FTP\nfind paths not in DB] --> S3f[add to orphanedFtpPaths]
    end

    Step3 --> Step4
    Step4["Step 4: mark orphanedDbIds\nas DEAD in DB"] --> Step5
    Step5["Step 5: for each orphanedFtpPath\nremoveFile from FTP"] --> Done([done])
```

---

## API Reference

Base path: `/v1`. Swagger UI: `/docs`.

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/oauth/google` | — | Redirect to Google consent screen |
| `GET` | `/oauth/google/callback` | — | OAuth callback, returns JWT |
| `GET` | `/auth/me` | ✓ | Current user profile |
| `GET` | `/auth/refresh` | ✓ | Refresh JWT |
| `GET` | `/auth/logout` | ✓ | Invalidate session |
| `GET` | `/auth/users` | ✓ | List all accounts |

### Folder

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/folder` | ✓ | Create folder (FTP first, then DB) |
| `PUT` | `/folder/:id` | ✓ | Rename / move folder (FTP rename first) |
| `DELETE` | `/folder/:id` | ✓ | Delete folder tree (DB first, FTP after) |
| `GET` | `/folder/:id` | ✓ | Folder detail |
| `GET` | `/folder/:id/real-path` | ✓ | Full FTP path |
| `GET` | `/my-folders` | ✓ | Authenticated user's folder tree |
| `GET` | `/folders` | ✓ | Paginated folder list |

### File

| Method | Path | Auth | Description |
|---|---|---|---|
| `PUT` | `/file/:id` | ✓ | Rename / move file (FTP rename first) |
| `DELETE` | `/file/:id` | ✓ | Delete file from FTP and DB |
| `GET` | `/file/:id` | ✓ | File detail |
| `GET` | `/my-files/:id` | ✓ | Files inside folder `id` |
| `GET` | `/file/history/:id` | ✓ | File version history |
| `GET` | `/files` | ✓ | Paginated file list |

### Media

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/media/upload/:id` | ✓ | Upload files to folder `id` |
| `POST` | `/media/upload/folder` | ✓ | Upload folder tree |
| `POST` | `/media/stream` | ✓ | Stream / download a file |
| `GET` | `/media/site` | ✓ | List registered FTP sites |

**Upload folder tree — query params:**

| Param | Type | Required | Description |
|---|---|---|---|
| `folderId` | `uuid` | no | Target parent folder. If set, `siteId` is read from the folder's source. |
| `siteId` | `integer` | when no `folderId` | FTP site port number |

**Upload folder tree — body (`multipart/form-data`):**

| Field | Description |
|---|---|
| `files` | One or more file binaries |
| `paths[]` | Relative path **including filename** for each file, e.g. `myFolder/sub/report.pdf`. Must have the same count as `files`. |

### Sharing

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/sharing/file` | ✓ | Share file with another account |
| `DELETE` | `/sharing/file/:id` | ✓ | Remove file sharing |
| `GET` | `/sharing/file/:id` | ✓ | File sharing detail |
| `POST` | `/sharing/folder` | ✓ | Share folder with another account |
| `DELETE` | `/sharing/folder/:id` | ✓ | Remove folder sharing |
| `GET` | `/sharing/folder/:id` | ✓ | Folder sharing detail |

Permissions: `READ_ONLY` | `READ_WRITE`

### Debug _(non-production only)_

| Method | Path | Description |
|---|---|---|
| `POST` | `/debug/ftp/:siteId` | Browse FTP directory tree |
| `GET` | `/debug/orphans` | Report orphaned files/folders |
| `DELETE` | `/debug/orphans` | Clean up orphaned records |

---

## Database Schema

Prisma schema: `prisma/schema.prisma` — PostgreSQL schema `drive`.

```mermaid
erDiagram
    Account ||--o{ Folder : owns
    Account ||--o{ File : owns
    Account ||--o{ Session : has
    Account ||--o{ FolderSharing : grants
    Account ||--o{ FileSharing : grants
    Account }o--|| Rbac : assigned
    Account }o--|| Diretorate : belongs

    Folder ||--o{ Folder : "parent/child"
    Folder ||--o{ File : contains
    Folder ||--o{ FolderSharing : shared-via

    File ||--o{ FileHistory : versioned-by
    File ||--o{ FileSharing : shared-via

    Account {
        uuid id PK
        string username UK
        string email
        string provider
        json accountInfo
        RecordStatus recordStatus
    }
    Folder {
        uuid id PK
        uuid parentId FK
        string folderName
        json source
        RecordStatus recordStatus
    }
    File {
        uuid id PK
        uuid folderId FK
        string fileName
        string fileHash
        int fileSize
        string fileType
        json source
        RecordStatus recordStatus
    }
    FileHistory {
        uuid id PK
        uuid fileId FK
        int version
        json json
    }
    FolderSharing {
        uuid id PK
        uuid folderId FK
        uuid toAccountId FK
        SharePermission permission
        datetime expiredAt
    }
    FileSharing {
        uuid id PK
        uuid fileId FK
        uuid toAccountId FK
        SharePermission permission
        datetime expiredAt
    }
```

**Record status lifecycle:** `NOT_ACTIVE` → `ACTIVE` → `DEAD`

The `source` JSON on `Folder` and `File` stores FTP origin:
```json
{ "ftpHost": "ftp.example.com", "ftpPort": 990, "remotePath": "/john_doe/reports" }
```

---

## Error Codes

| Code | HTTP | Description |
|---|---|---|
| `UNAUTHORIZED` | 401 | Missing or invalid Bearer token |
| `FOLDER_NOT_FOUND` | 404 | Target folder does not exist |
| `FOLDER_EXISTS` | 409 | Folder name already taken under same parent |
| `FOLDER_EXIST` | 409 | Folder name conflict during rename |
| `PARENT_NOT_FOUND` | 404 | Parent folder does not exist |
| `FILE_NOT_FOUND` | 404 | File does not exist |
| `FILE_EXIST` | 409 | File name already taken in same folder |
| `SOURCE_NOT_FOUND` | 404 | FTP source metadata missing from record |
| `EMPTY_FILE` | 400 | No files provided in upload |
| `SITE_ID_REQUIRED` | 400 | `siteId` required when `folderId` is absent |
| `RELATIVE_PATH_NOT_SYNCUP` | 400 | `paths[]` count does not match `files` count |
| `NO_ROOT_FOLDER` | 400 | Files without sub-paths require a `folderId` |
| `FTP_CONNECT_ISSUE` | 500 | Cannot establish FTP connection |
| `FTP_FILE_NOT_FOUND` | 404 | File not found on FTP server |
| `FILE_HASH_NOT_IMPLEMENTED` | 501 | FTP server does not support XMD5 |
