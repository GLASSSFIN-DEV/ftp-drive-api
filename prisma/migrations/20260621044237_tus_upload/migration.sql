-- CreateTable
CREATE TABLE "TusUpload" (
    "id" TEXT NOT NULL,
    "siteId" INTEGER NOT NULL,
    "tempPath" TEXT NOT NULL,
    "size" INTEGER,
    "offset" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "TusUpload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TusUpload_expiresAt_idx" ON "TusUpload"("expiresAt");

-- CreateIndex
CREATE INDEX "TusUpload_createdAt_idx" ON "TusUpload"("createdAt" DESC);
