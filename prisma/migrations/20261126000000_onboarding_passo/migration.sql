-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "onboardingStep" INTEGER NOT NULL DEFAULT 0;


-- Quem já concluiu a configuração (ou já usava o sistema) fica com todos os passos concluídos
UPDATE "Business" SET "onboardingStep" = 6 WHERE "onboardedAt" IS NOT NULL;
