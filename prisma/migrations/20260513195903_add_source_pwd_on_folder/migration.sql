/*
  Warnings:

  - Added the required column `source` to the `Folder` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Folder" ADD COLUMN     "pwd" TEXT,
ADD COLUMN     "source" TEXT NOT NULL;
