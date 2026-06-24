-- Enable Extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- DropIndex
DROP INDEX "File_fileName_idx";

-- AlterTable
ALTER TABLE "File" ADD COLUMN     "fileNameFts" tsvector;

-- AlterTable
ALTER TABLE "FileVector" ADD COLUMN     "contentFts" tsvector;

-- AlterTable
ALTER TABLE "Folder" ADD COLUMN     "folderNameFts" tsvector;

-- CreateTable
CREATE TABLE "Prompt" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prompt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Prompt_name_key" ON "Prompt"("name");

-- CreateIndex
CREATE INDEX "File_fileName_trgm_idx" ON "File" USING GIN ("fileName" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "File_fileNameFts_idx" ON "File" USING GIN ("fileNameFts");

-- CreateIndex
CREATE INDEX "FileVector_content_trgm_idx" ON "FileVector" USING GIN ("content" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "FileVector_contentFts_idx" ON "FileVector" USING GIN ("contentFts");

-- CreateIndex
CREATE INDEX "Folder_folderName_trgm_idx" ON "Folder" USING GIN ("folderName" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Folder_folderNameFts_idx" ON "Folder" USING GIN ("folderNameFts");
