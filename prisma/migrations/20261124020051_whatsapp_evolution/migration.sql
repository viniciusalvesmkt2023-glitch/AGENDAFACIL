-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "msgConfirmation" TEXT,
ADD COLUMN     "msgReminder" TEXT,
ADD COLUMN     "whatsappConnectedAt" TIMESTAMP(3),
ADD COLUMN     "whatsappInstance" TEXT,
ADD COLUMN     "whatsappNumber" TEXT,
ADD COLUMN     "whatsappStatus" TEXT NOT NULL DEFAULT 'DISCONNECTED';

-- CreateIndex
CREATE UNIQUE INDEX "Business_whatsappInstance_key" ON "Business"("whatsappInstance");

