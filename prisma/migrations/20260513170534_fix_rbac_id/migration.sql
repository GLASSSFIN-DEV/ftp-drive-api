/*
  Warnings:

  - You are about to drop the column `rbac` on the `Account` table. All the data in the column will be lost.
  - Added the required column `rbacId` to the `Account` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Account" DROP COLUMN "rbac",
ADD COLUMN     "rbacId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_rbacId_fkey" FOREIGN KEY ("rbacId") REFERENCES "Rbac"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
