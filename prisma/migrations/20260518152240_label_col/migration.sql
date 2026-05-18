/*
  Warnings:

  - You are about to drop the `Node` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `NodeShare` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Node" DROP CONSTRAINT "Node_accountId_fkey";

-- DropForeignKey
ALTER TABLE "Node" DROP CONSTRAINT "Node_parentId_fkey";

-- DropForeignKey
ALTER TABLE "NodeShare" DROP CONSTRAINT "NodeShare_accountId_fkey";

-- DropForeignKey
ALTER TABLE "NodeShare" DROP CONSTRAINT "NodeShare_nodeId_fkey";

-- DropForeignKey
ALTER TABLE "NodeShare" DROP CONSTRAINT "NodeShare_toAccountId_fkey";

-- AlterTable
ALTER TABLE "Folder" ADD COLUMN     "label" JSONB[] DEFAULT ARRAY[]::JSONB[];

-- DropTable
DROP TABLE "Node";

-- DropTable
DROP TABLE "NodeShare";
