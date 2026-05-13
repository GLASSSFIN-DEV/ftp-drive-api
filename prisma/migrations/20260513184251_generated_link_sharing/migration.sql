/*
  Warnings:

  - Added the required column `generatedLink` to the `FileSharing` table without a default value. This is not possible if the table is not empty.
  - Added the required column `generatedLink` to the `FolderSharing` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FileSharing" ADD COLUMN     "generatedLink" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "FolderSharing" ADD COLUMN     "generatedLink" TEXT NOT NULL;
