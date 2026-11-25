-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "statusChecks" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Payment_status_method_createdAt_idx" ON "Payment"("status", "method", "createdAt");

