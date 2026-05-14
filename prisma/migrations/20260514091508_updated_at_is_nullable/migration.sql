/*
  Warnings:

  - You are about to drop the column `pwd` on the `Folder` table. All the data in the column will be lost.
  - Changed the type of `source` on the `Folder` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Account" ALTER COLUMN "updatedAt" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Diretorate" ALTER COLUMN "updatedAt" DROP NOT NULL;

-- AlterTable
ALTER TABLE "File" ALTER COLUMN "updatedAt" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Folder" DROP COLUMN "pwd",
ALTER COLUMN "updatedAt" DROP NOT NULL,
DROP COLUMN "source",
ADD COLUMN     "source" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "Rbac" ALTER COLUMN "updatedAt" DROP NOT NULL;
