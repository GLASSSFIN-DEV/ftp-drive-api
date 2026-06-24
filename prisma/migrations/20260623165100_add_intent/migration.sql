-- Extension
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE "FileVector" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "embedding" vector(768),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "intent" JSONB[] DEFAULT ARRAY[]::JSONB[],

    CONSTRAINT "FileVector_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FileVector_fileId_idx" ON "FileVector"("fileId");

-- AddForeignKey
ALTER TABLE "FileVector" ADD CONSTRAINT "FileVector_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
