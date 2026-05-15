-- CreateTable
CREATE TABLE "Node" (
    "id" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "source" JSONB NOT NULL,
    "isDirectory" BOOLEAN NOT NULL,
    "file" JSONB,
    "folder" JSONB,
    "accountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3),
    "recordStatus" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "Node_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NodeShare" (
    "id" TEXT NOT NULL,
    "toAccountId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "expiredAt" TIMESTAMP(3),
    "permission" "SharePermission" NOT NULL DEFAULT 'READ_ONLY',
    "generatedLink" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NodeShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Node_accountId_idx" ON "Node"("accountId");

-- CreateIndex
CREATE INDEX "Node_parentId_idx" ON "Node"("parentId");

-- CreateIndex
CREATE INDEX "Node_recordStatus_idx" ON "Node"("recordStatus");

-- CreateIndex
CREATE INDEX "Node_isDirectory_idx" ON "Node"("isDirectory");

-- CreateIndex
CREATE INDEX "NodeShare_accountId_idx" ON "NodeShare"("accountId");

-- CreateIndex
CREATE INDEX "NodeShare_toAccountId_idx" ON "NodeShare"("toAccountId");

-- CreateIndex
CREATE INDEX "NodeShare_nodeId_idx" ON "NodeShare"("nodeId");

-- AddForeignKey
ALTER TABLE "Node" ADD CONSTRAINT "Node_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Node" ADD CONSTRAINT "Node_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Node"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodeShare" ADD CONSTRAINT "NodeShare_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodeShare" ADD CONSTRAINT "NodeShare_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodeShare" ADD CONSTRAINT "NodeShare_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
