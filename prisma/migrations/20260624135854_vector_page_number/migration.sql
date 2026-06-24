/*
  Warnings:

  - Added the required column `pageNumber` to the `FileVector` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FileVector" ADD COLUMN     "pageNumber" INTEGER NOT NULL;
