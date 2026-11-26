-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "brandColor" TEXT,
ADD COLUMN     "coverImageId" TEXT,
ADD COLUMN     "instagram" TEXT,
ADD COLUMN     "logoImageId" TEXT,
ADD COLUMN     "mapsUrl" TEXT,
ADD COLUMN     "reviewUrl" TEXT,
ADD COLUMN     "tagline" TEXT;

-- CreateTable
CREATE TABLE "BusinessImage" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusinessImage_businessId_idx" ON "BusinessImage"("businessId");

-- AddForeignKey
ALTER TABLE "BusinessImage" ADD CONSTRAINT "BusinessImage_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Segurança (Supabase): RLS ligado, como nas demais tabelas
ALTER TABLE "BusinessImage" ENABLE ROW LEVEL SECURITY;
