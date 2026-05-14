-- DropForeignKey
ALTER TABLE "FileSharing" DROP CONSTRAINT "FileSharing_fileId_fkey";

-- AddForeignKey
ALTER TABLE "FileSharing" ADD CONSTRAINT "FileSharing_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
