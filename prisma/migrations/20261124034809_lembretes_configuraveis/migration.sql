-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "confirmationEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reminderDayMode" TEXT NOT NULL DEFAULT '24H',
ADD COLUMN     "reminderDayTime" INTEGER NOT NULL DEFAULT 1080,
ADD COLUMN     "reminderShortMinutes" INTEGER NOT NULL DEFAULT 60;

