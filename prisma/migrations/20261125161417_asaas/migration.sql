-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "asaasCustomerId" TEXT,
ADD COLUMN     "asaasPlan" TEXT,
ADD COLUMN     "asaasSubscriptionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Business_asaasCustomerId_key" ON "Business"("asaasCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Business_asaasSubscriptionId_key" ON "Business"("asaasSubscriptionId");

