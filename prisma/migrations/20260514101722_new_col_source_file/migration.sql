/*
  Warnings:

  - Added the required column `source` to the `File` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "File" ADD COLUMN     "source" JSONB NOT NULL,
ALTER COLUMN "fileHash" DROP NOT NULL;
