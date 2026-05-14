/*
  Warnings:

  - Added the required column `accountId` to the `FileSharing` table without a default value. This is not possible if the table is not empty.
  - Added the required column `accountId` to the `FolderSharing` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FileSharing" ADD COLUMN     "accountId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "FolderSharing" ADD COLUMN     "accountId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "FolderSharing" ADD CONSTRAINT "FolderSharing_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileSharing" ADD CONSTRAINT "FileSharing_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
