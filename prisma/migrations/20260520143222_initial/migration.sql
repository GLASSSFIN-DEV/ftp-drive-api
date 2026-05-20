-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('ACTIVE', 'NOT_ACTIVE', 'DEAD');

-- CreateEnum
CREATE TYPE "SharePermission" AS ENUM ('READ_ONLY', 'READ_WRITE');

-- CreateTable
CREATE TABLE "Option" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "json" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Option_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "dirId" TEXT,
    "username" TEXT NOT NULL,
    "fullname" TEXT,
    "email" TEXT,
    "provider" TEXT NOT NULL,
    "rbacId" TEXT,
    "accountInfo" JSONB,
    "quota" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "recordStatus" "RecordStatus" NOT NULL DEFAULT 'NOT_ACTIVE',

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "appCode" TEXT NOT NULL DEFAULT 'main_app',
    "jwtHash" TEXT NOT NULL,
    "recordStatus" "RecordStatus" NOT NULL DEFAULT 'NOT_ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Diretorate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "accountId" TEXT,
    "recordStatus" "RecordStatus" NOT NULL DEFAULT 'NOT_ACTIVE',

    CONSTRAINT "Diretorate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rbac" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" JSONB,
    "accountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "recordStatus" "RecordStatus" NOT NULL DEFAULT 'NOT_ACTIVE',

    CONSTRAINT "Rbac_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Folder" (
    "id" TEXT NOT NULL,
    "parentId" TEXT,
    "accountId" TEXT NOT NULL,
    "folderName" TEXT NOT NULL,
    "source" JSONB NOT NULL,
    "label" JSONB[] DEFAULT ARRAY[]::JSONB[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "recordStatus" "RecordStatus" NOT NULL DEFAULT 'NOT_ACTIVE',

    CONSTRAINT "Folder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileHash" TEXT,
    "fileSize" INTEGER NOT NULL,
    "fileType" TEXT NOT NULL,
    "source" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "accountId" TEXT NOT NULL,
    "recordStatus" "RecordStatus" NOT NULL DEFAULT 'NOT_ACTIVE',

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileHistory" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "json" JSONB NOT NULL,
    "version" INTEGER NOT NULL,
    "accountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FolderSharing" (
    "id" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "toAccountId" TEXT NOT NULL,
    "expiredAt" TIMESTAMP(3),
    "permission" "SharePermission" NOT NULL DEFAULT 'READ_ONLY',
    "generatedLink" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordStatus" "RecordStatus" NOT NULL DEFAULT 'NOT_ACTIVE',

    CONSTRAINT "FolderSharing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileSharing" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "toAccountId" TEXT NOT NULL,
    "expiredAt" TIMESTAMP(3),
    "permission" "SharePermission" NOT NULL DEFAULT 'READ_ONLY',
    "generatedLink" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordStatus" "RecordStatus" NOT NULL DEFAULT 'NOT_ACTIVE',

    CONSTRAINT "FileSharing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trace" (
    "id" TEXT NOT NULL,
    "accountId" TEXT,
    "url" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "responseTimeMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TraceSpan" (
    "id" TEXT NOT NULL,
    "traceId" TEXT,
    "json" JSONB,
    "context" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TraceSpan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Option_createdAt_idx" ON "Option"("createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Account_username_key" ON "Account"("username");

-- CreateIndex
CREATE INDEX "Account_dirId_idx" ON "Account"("dirId");

-- CreateIndex
CREATE INDEX "Account_rbacId_idx" ON "Account"("rbacId");

-- CreateIndex
CREATE INDEX "Account_provider_idx" ON "Account"("provider");

-- CreateIndex
CREATE INDEX "Account_recordStatus_idx" ON "Account"("recordStatus");

-- CreateIndex
CREATE INDEX "Account_createdAt_idx" ON "Account"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Account_username_provider_idx" ON "Account"("username", "provider");

-- CreateIndex
CREATE INDEX "Session_accountId_idx" ON "Session"("accountId");

-- CreateIndex
CREATE INDEX "Session_jwtHash_idx" ON "Session"("jwtHash");

-- CreateIndex
CREATE INDEX "Session_recordStatus_idx" ON "Session"("recordStatus");

-- CreateIndex
CREATE INDEX "Session_createdAt_idx" ON "Session"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Session_accountId_appCode_idx" ON "Session"("accountId", "appCode");

-- CreateIndex
CREATE INDEX "Diretorate_accountId_idx" ON "Diretorate"("accountId");

-- CreateIndex
CREATE INDEX "Diretorate_recordStatus_idx" ON "Diretorate"("recordStatus");

-- CreateIndex
CREATE INDEX "Diretorate_createdAt_idx" ON "Diretorate"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Diretorate_name_idx" ON "Diretorate"("name");

-- CreateIndex
CREATE INDEX "Rbac_accountId_idx" ON "Rbac"("accountId");

-- CreateIndex
CREATE INDEX "Rbac_recordStatus_idx" ON "Rbac"("recordStatus");

-- CreateIndex
CREATE INDEX "Rbac_createdAt_idx" ON "Rbac"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Folder_parentId_idx" ON "Folder"("parentId");

-- CreateIndex
CREATE INDEX "Folder_accountId_idx" ON "Folder"("accountId");

-- CreateIndex
CREATE INDEX "Folder_recordStatus_idx" ON "Folder"("recordStatus");

-- CreateIndex
CREATE INDEX "Folder_createdAt_idx" ON "Folder"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Folder_folderName_idx" ON "Folder"("folderName");

-- CreateIndex
CREATE INDEX "Folder_accountId_parentId_idx" ON "Folder"("accountId", "parentId");

-- CreateIndex
CREATE INDEX "Folder_accountId_folderName_idx" ON "Folder"("accountId", "folderName");

-- CreateIndex
CREATE INDEX "File_folderId_idx" ON "File"("folderId");

-- CreateIndex
CREATE INDEX "File_accountId_idx" ON "File"("accountId");

-- CreateIndex
CREATE INDEX "File_recordStatus_idx" ON "File"("recordStatus");

-- CreateIndex
CREATE INDEX "File_createdAt_idx" ON "File"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "File_fileHash_idx" ON "File"("fileHash");

-- CreateIndex
CREATE INDEX "File_fileType_idx" ON "File"("fileType");

-- CreateIndex
CREATE INDEX "File_fileName_idx" ON "File"("fileName");

-- CreateIndex
CREATE INDEX "File_folderId_fileName_idx" ON "File"("folderId", "fileName");

-- CreateIndex
CREATE INDEX "File_accountId_folderId_idx" ON "File"("accountId", "folderId");

-- CreateIndex
CREATE INDEX "FileHistory_fileId_accountId_idx" ON "FileHistory"("fileId", "accountId");

-- CreateIndex
CREATE INDEX "FolderSharing_folderId_idx" ON "FolderSharing"("folderId");

-- CreateIndex
CREATE INDEX "FolderSharing_accountId_idx" ON "FolderSharing"("accountId");

-- CreateIndex
CREATE INDEX "FolderSharing_toAccountId_idx" ON "FolderSharing"("toAccountId");

-- CreateIndex
CREATE INDEX "FolderSharing_generatedLink_idx" ON "FolderSharing"("generatedLink");

-- CreateIndex
CREATE INDEX "FolderSharing_expiredAt_idx" ON "FolderSharing"("expiredAt");

-- CreateIndex
CREATE INDEX "FolderSharing_recordStatus_idx" ON "FolderSharing"("recordStatus");

-- CreateIndex
CREATE INDEX "FileSharing_fileId_idx" ON "FileSharing"("fileId");

-- CreateIndex
CREATE INDEX "FileSharing_accountId_idx" ON "FileSharing"("accountId");

-- CreateIndex
CREATE INDEX "FileSharing_toAccountId_idx" ON "FileSharing"("toAccountId");

-- CreateIndex
CREATE INDEX "FileSharing_generatedLink_idx" ON "FileSharing"("generatedLink");

-- CreateIndex
CREATE INDEX "FileSharing_expiredAt_idx" ON "FileSharing"("expiredAt");

-- CreateIndex
CREATE INDEX "FileSharing_recordStatus_idx" ON "FileSharing"("recordStatus");

-- CreateIndex
CREATE INDEX "Trace_accountId_idx" ON "Trace"("accountId");

-- CreateIndex
CREATE INDEX "Trace_status_idx" ON "Trace"("status");

-- CreateIndex
CREATE INDEX "Trace_method_idx" ON "Trace"("method");

-- CreateIndex
CREATE INDEX "Trace_createdAt_idx" ON "Trace"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Trace_url_idx" ON "Trace"("url");

-- CreateIndex
CREATE INDEX "TraceSpan_traceId_idx" ON "TraceSpan"("traceId");

-- CreateIndex
CREATE INDEX "TraceSpan_context_idx" ON "TraceSpan"("context");

-- CreateIndex
CREATE INDEX "TraceSpan_createdAt_idx" ON "TraceSpan"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "TraceSpan_durationMs_idx" ON "TraceSpan"("durationMs");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_dirId_fkey" FOREIGN KEY ("dirId") REFERENCES "Diretorate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_rbacId_fkey" FOREIGN KEY ("rbacId") REFERENCES "Rbac"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diretorate" ADD CONSTRAINT "Diretorate_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rbac" ADD CONSTRAINT "Rbac_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileHistory" ADD CONSTRAINT "FileHistory_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileHistory" ADD CONSTRAINT "FileHistory_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FolderSharing" ADD CONSTRAINT "FolderSharing_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FolderSharing" ADD CONSTRAINT "FolderSharing_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FolderSharing" ADD CONSTRAINT "FolderSharing_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileSharing" ADD CONSTRAINT "FileSharing_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileSharing" ADD CONSTRAINT "FileSharing_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileSharing" ADD CONSTRAINT "FileSharing_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trace" ADD CONSTRAINT "Trace_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
