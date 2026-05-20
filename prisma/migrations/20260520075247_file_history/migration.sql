-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "drive";

-- CreateEnum
CREATE TYPE "drive"."RecordStatus" AS ENUM ('ACTIVE', 'NOT_ACTIVE', 'DEAD');

-- CreateEnum
CREATE TYPE "drive"."SharePermission" AS ENUM ('READ_ONLY', 'READ_WRITE');

-- CreateTable
CREATE TABLE "drive"."Option" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "json" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Option_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drive"."Account" (
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
    "recordStatus" "drive"."RecordStatus" NOT NULL DEFAULT 'NOT_ACTIVE',

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drive"."Session" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "appCode" TEXT NOT NULL DEFAULT 'main_app',
    "jwtHash" TEXT NOT NULL,
    "recordStatus" "drive"."RecordStatus" NOT NULL DEFAULT 'NOT_ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drive"."Diretorate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "accountId" TEXT,
    "recordStatus" "drive"."RecordStatus" NOT NULL DEFAULT 'NOT_ACTIVE',

    CONSTRAINT "Diretorate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drive"."Rbac" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" JSONB,
    "accountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "recordStatus" "drive"."RecordStatus" NOT NULL DEFAULT 'NOT_ACTIVE',

    CONSTRAINT "Rbac_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drive"."Folder" (
    "id" TEXT NOT NULL,
    "parentId" TEXT,
    "accountId" TEXT NOT NULL,
    "folderName" TEXT NOT NULL,
    "source" JSONB NOT NULL,
    "label" JSONB[] DEFAULT ARRAY[]::JSONB[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "recordStatus" "drive"."RecordStatus" NOT NULL DEFAULT 'NOT_ACTIVE',

    CONSTRAINT "Folder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drive"."File" (
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
    "recordStatus" "drive"."RecordStatus" NOT NULL DEFAULT 'NOT_ACTIVE',

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drive"."FileHistory" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "json" JSONB NOT NULL,
    "version" INTEGER NOT NULL,
    "accountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drive"."FolderSharing" (
    "id" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "toAccountId" TEXT NOT NULL,
    "expiredAt" TIMESTAMP(3),
    "permission" "drive"."SharePermission" NOT NULL DEFAULT 'READ_ONLY',
    "generatedLink" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordStatus" "drive"."RecordStatus" NOT NULL DEFAULT 'NOT_ACTIVE',

    CONSTRAINT "FolderSharing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drive"."FileSharing" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "toAccountId" TEXT NOT NULL,
    "expiredAt" TIMESTAMP(3),
    "permission" "drive"."SharePermission" NOT NULL DEFAULT 'READ_ONLY',
    "generatedLink" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordStatus" "drive"."RecordStatus" NOT NULL DEFAULT 'NOT_ACTIVE',

    CONSTRAINT "FileSharing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drive"."Trace" (
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
CREATE TABLE "drive"."TraceSpan" (
    "id" TEXT NOT NULL,
    "traceId" TEXT,
    "json" JSONB,
    "context" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TraceSpan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Option_createdAt_idx" ON "drive"."Option"("createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Account_username_key" ON "drive"."Account"("username");

-- CreateIndex
CREATE INDEX "Account_dirId_idx" ON "drive"."Account"("dirId");

-- CreateIndex
CREATE INDEX "Account_rbacId_idx" ON "drive"."Account"("rbacId");

-- CreateIndex
CREATE INDEX "Account_provider_idx" ON "drive"."Account"("provider");

-- CreateIndex
CREATE INDEX "Account_recordStatus_idx" ON "drive"."Account"("recordStatus");

-- CreateIndex
CREATE INDEX "Account_createdAt_idx" ON "drive"."Account"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Account_username_provider_idx" ON "drive"."Account"("username", "provider");

-- CreateIndex
CREATE INDEX "Session_accountId_idx" ON "drive"."Session"("accountId");

-- CreateIndex
CREATE INDEX "Session_jwtHash_idx" ON "drive"."Session"("jwtHash");

-- CreateIndex
CREATE INDEX "Session_recordStatus_idx" ON "drive"."Session"("recordStatus");

-- CreateIndex
CREATE INDEX "Session_createdAt_idx" ON "drive"."Session"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Session_accountId_appCode_idx" ON "drive"."Session"("accountId", "appCode");

-- CreateIndex
CREATE INDEX "Diretorate_accountId_idx" ON "drive"."Diretorate"("accountId");

-- CreateIndex
CREATE INDEX "Diretorate_recordStatus_idx" ON "drive"."Diretorate"("recordStatus");

-- CreateIndex
CREATE INDEX "Diretorate_createdAt_idx" ON "drive"."Diretorate"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Diretorate_name_idx" ON "drive"."Diretorate"("name");

-- CreateIndex
CREATE INDEX "Rbac_accountId_idx" ON "drive"."Rbac"("accountId");

-- CreateIndex
CREATE INDEX "Rbac_recordStatus_idx" ON "drive"."Rbac"("recordStatus");

-- CreateIndex
CREATE INDEX "Rbac_createdAt_idx" ON "drive"."Rbac"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Folder_parentId_idx" ON "drive"."Folder"("parentId");

-- CreateIndex
CREATE INDEX "Folder_accountId_idx" ON "drive"."Folder"("accountId");

-- CreateIndex
CREATE INDEX "Folder_recordStatus_idx" ON "drive"."Folder"("recordStatus");

-- CreateIndex
CREATE INDEX "Folder_createdAt_idx" ON "drive"."Folder"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Folder_folderName_idx" ON "drive"."Folder"("folderName");

-- CreateIndex
CREATE INDEX "Folder_accountId_parentId_idx" ON "drive"."Folder"("accountId", "parentId");

-- CreateIndex
CREATE INDEX "Folder_accountId_folderName_idx" ON "drive"."Folder"("accountId", "folderName");

-- CreateIndex
CREATE INDEX "File_folderId_idx" ON "drive"."File"("folderId");

-- CreateIndex
CREATE INDEX "File_accountId_idx" ON "drive"."File"("accountId");

-- CreateIndex
CREATE INDEX "File_recordStatus_idx" ON "drive"."File"("recordStatus");

-- CreateIndex
CREATE INDEX "File_createdAt_idx" ON "drive"."File"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "File_fileHash_idx" ON "drive"."File"("fileHash");

-- CreateIndex
CREATE INDEX "File_fileType_idx" ON "drive"."File"("fileType");

-- CreateIndex
CREATE INDEX "File_fileName_idx" ON "drive"."File"("fileName");

-- CreateIndex
CREATE INDEX "File_folderId_fileName_idx" ON "drive"."File"("folderId", "fileName");

-- CreateIndex
CREATE INDEX "File_accountId_folderId_idx" ON "drive"."File"("accountId", "folderId");

-- CreateIndex
CREATE INDEX "FileHistory_fileId_accountId_idx" ON "drive"."FileHistory"("fileId", "accountId");

-- CreateIndex
CREATE INDEX "FolderSharing_folderId_idx" ON "drive"."FolderSharing"("folderId");

-- CreateIndex
CREATE INDEX "FolderSharing_accountId_idx" ON "drive"."FolderSharing"("accountId");

-- CreateIndex
CREATE INDEX "FolderSharing_toAccountId_idx" ON "drive"."FolderSharing"("toAccountId");

-- CreateIndex
CREATE INDEX "FolderSharing_generatedLink_idx" ON "drive"."FolderSharing"("generatedLink");

-- CreateIndex
CREATE INDEX "FolderSharing_expiredAt_idx" ON "drive"."FolderSharing"("expiredAt");

-- CreateIndex
CREATE INDEX "FolderSharing_recordStatus_idx" ON "drive"."FolderSharing"("recordStatus");

-- CreateIndex
CREATE INDEX "FileSharing_fileId_idx" ON "drive"."FileSharing"("fileId");

-- CreateIndex
CREATE INDEX "FileSharing_accountId_idx" ON "drive"."FileSharing"("accountId");

-- CreateIndex
CREATE INDEX "FileSharing_toAccountId_idx" ON "drive"."FileSharing"("toAccountId");

-- CreateIndex
CREATE INDEX "FileSharing_generatedLink_idx" ON "drive"."FileSharing"("generatedLink");

-- CreateIndex
CREATE INDEX "FileSharing_expiredAt_idx" ON "drive"."FileSharing"("expiredAt");

-- CreateIndex
CREATE INDEX "FileSharing_recordStatus_idx" ON "drive"."FileSharing"("recordStatus");

-- CreateIndex
CREATE INDEX "Trace_accountId_idx" ON "drive"."Trace"("accountId");

-- CreateIndex
CREATE INDEX "Trace_status_idx" ON "drive"."Trace"("status");

-- CreateIndex
CREATE INDEX "Trace_method_idx" ON "drive"."Trace"("method");

-- CreateIndex
CREATE INDEX "Trace_createdAt_idx" ON "drive"."Trace"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Trace_url_idx" ON "drive"."Trace"("url");

-- CreateIndex
CREATE INDEX "TraceSpan_traceId_idx" ON "drive"."TraceSpan"("traceId");

-- CreateIndex
CREATE INDEX "TraceSpan_context_idx" ON "drive"."TraceSpan"("context");

-- CreateIndex
CREATE INDEX "TraceSpan_createdAt_idx" ON "drive"."TraceSpan"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "TraceSpan_durationMs_idx" ON "drive"."TraceSpan"("durationMs");

-- AddForeignKey
ALTER TABLE "drive"."Account" ADD CONSTRAINT "Account_dirId_fkey" FOREIGN KEY ("dirId") REFERENCES "drive"."Diretorate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive"."Account" ADD CONSTRAINT "Account_rbacId_fkey" FOREIGN KEY ("rbacId") REFERENCES "drive"."Rbac"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive"."Session" ADD CONSTRAINT "Session_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "drive"."Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive"."Diretorate" ADD CONSTRAINT "Diretorate_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "drive"."Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive"."Rbac" ADD CONSTRAINT "Rbac_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "drive"."Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive"."Folder" ADD CONSTRAINT "Folder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "drive"."Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive"."Folder" ADD CONSTRAINT "Folder_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "drive"."Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive"."File" ADD CONSTRAINT "File_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "drive"."Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive"."File" ADD CONSTRAINT "File_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "drive"."Folder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive"."FileHistory" ADD CONSTRAINT "FileHistory_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "drive"."Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive"."FileHistory" ADD CONSTRAINT "FileHistory_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "drive"."File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive"."FolderSharing" ADD CONSTRAINT "FolderSharing_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "drive"."Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive"."FolderSharing" ADD CONSTRAINT "FolderSharing_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "drive"."Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive"."FolderSharing" ADD CONSTRAINT "FolderSharing_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "drive"."Folder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive"."FileSharing" ADD CONSTRAINT "FileSharing_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "drive"."Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive"."FileSharing" ADD CONSTRAINT "FileSharing_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "drive"."Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive"."FileSharing" ADD CONSTRAINT "FileSharing_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "drive"."File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive"."Trace" ADD CONSTRAINT "Trace_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "drive"."Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
