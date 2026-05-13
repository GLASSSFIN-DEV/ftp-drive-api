/*
  Warnings:

  - Added the required column `updatedAt` to the `Account` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Diretorate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `File` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Folder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Rbac` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Diretorate" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "File" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "FileSharing" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Folder" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "FolderSharing" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Rbac" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
