/*
  Warnings:

  - A unique constraint covering the columns `[username]` on the table `Account` will be added. If there are existing duplicate values, this will fail.
  - Made the column `accountId` on table `Submission` required. This step will fail if there are existing NULL values in that column.
  - Made the column `actionBy` on table `Submission` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_dirId_fkey";

-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_rbacId_fkey";

-- DropForeignKey
ALTER TABLE "Submission" DROP CONSTRAINT "Submission_accountId_fkey";

-- DropForeignKey
ALTER TABLE "Submission" DROP CONSTRAINT "Submission_actionBy_fkey";

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "accountInfo" JSONB,
ALTER COLUMN "dirId" DROP NOT NULL,
ALTER COLUMN "rbacId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Submission" ALTER COLUMN "accountId" SET NOT NULL,
ALTER COLUMN "actionBy" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Account_username_key" ON "Account"("username");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_dirId_fkey" FOREIGN KEY ("dirId") REFERENCES "Diretorate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_rbacId_fkey" FOREIGN KEY ("rbacId") REFERENCES "Rbac"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_actionBy_fkey" FOREIGN KEY ("actionBy") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
