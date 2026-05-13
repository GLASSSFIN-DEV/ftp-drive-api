/*
  Warnings:

  - A unique constraint covering the columns `[verificationCode]` on the table `Submission` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `name` to the `Rbac` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SharePermission" AS ENUM ('READ_ONLY', 'READ_WRITE');

-- AlterTable
ALTER TABLE "FileSharing" ADD COLUMN     "permission" "SharePermission" NOT NULL DEFAULT 'READ_ONLY';

-- AlterTable
ALTER TABLE "FolderSharing" ADD COLUMN     "permission" "SharePermission" NOT NULL DEFAULT 'READ_ONLY';

-- AlterTable
ALTER TABLE "Rbac" ADD COLUMN     "name" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Submission_verificationCode_key" ON "Submission"("verificationCode");
