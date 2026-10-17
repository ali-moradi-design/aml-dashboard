-- AlterTable
ALTER TABLE "NewsAttachment" ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'file',
ADD COLUMN     "uploadedById" TEXT NOT NULL,
ALTER COLUMN "newsId" DROP NOT NULL;

