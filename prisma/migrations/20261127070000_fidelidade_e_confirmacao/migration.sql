-- Confirmação automática/manual e cartão fidelidade
ALTER TABLE "Business" ADD COLUMN "autoConfirm" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "loyaltyEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "loyaltyGoal" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN "loyaltyRewardType" TEXT NOT NULL DEFAULT 'FREE_SERVICE',
ADD COLUMN "loyaltyRewardServiceId" TEXT,
ADD COLUMN "loyaltyRewardValue" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "loyaltyServiceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "loyaltyStampMonths" INTEGER,
ADD COLUMN "loyaltyRewardDays" INTEGER DEFAULT 90,
ADD COLUMN "loyaltyNotify" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "loyaltyStartedAt" TIMESTAMP(3);

ALTER TABLE "Appointment" ADD COLUMN "loyaltyRewardId" TEXT;
CREATE UNIQUE INDEX "Appointment_loyaltyRewardId_key" ON "Appointment"("loyaltyRewardId");

CREATE TABLE "LoyaltyStamp" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "date" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'APPOINTMENT',
    "rewardId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoyaltyStamp_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "LoyaltyReward" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "rewardType" TEXT NOT NULL,
    "rewardValue" INTEGER NOT NULL,
    "rewardServiceId" TEXT,
    "label" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoyaltyReward_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LoyaltyStamp_appointmentId_key" ON "LoyaltyStamp"("appointmentId");
CREATE INDEX "LoyaltyStamp_businessId_clientId_idx" ON "LoyaltyStamp"("businessId", "clientId");
CREATE INDEX "LoyaltyReward_businessId_clientId_idx" ON "LoyaltyReward"("businessId", "clientId");

ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_loyaltyRewardId_fkey" FOREIGN KEY ("loyaltyRewardId") REFERENCES "LoyaltyReward"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LoyaltyStamp" ADD CONSTRAINT "LoyaltyStamp_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoyaltyStamp" ADD CONSTRAINT "LoyaltyStamp_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoyaltyStamp" ADD CONSTRAINT "LoyaltyStamp_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoyaltyStamp" ADD CONSTRAINT "LoyaltyStamp_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "LoyaltyReward"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LoyaltyReward" ADD CONSTRAINT "LoyaltyReward_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoyaltyReward" ADD CONSTRAINT "LoyaltyReward_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LoyaltyStamp" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LoyaltyReward" ENABLE ROW LEVEL SECURITY;
