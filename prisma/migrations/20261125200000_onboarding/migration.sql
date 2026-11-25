-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "businessType" TEXT NOT NULL DEFAULT 'OUTRO',
ADD COLUMN     "homeService" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onboardedAt" TIMESTAMP(3);


-- Estabelecimentos que já existiam não passam pela configuração inicial
UPDATE "Business" SET "onboardedAt" = now() WHERE "onboardedAt" IS NULL;
