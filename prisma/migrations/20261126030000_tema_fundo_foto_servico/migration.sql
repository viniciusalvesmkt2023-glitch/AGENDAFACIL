-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "bgPattern" TEXT NOT NULL DEFAULT 'NONE',
ADD COLUMN     "pageTheme" TEXT NOT NULL DEFAULT 'LIGHT';

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "imageId" TEXT;

