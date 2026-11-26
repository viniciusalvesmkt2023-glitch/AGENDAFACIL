-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "bufferMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "cancelDeadlineMinutes" INTEGER NOT NULL DEFAULT 120,
ADD COLUMN     "clientCanReschedule" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "clientCancelPolicy" TEXT NOT NULL DEFAULT 'FREE';

-- AlterTable
ALTER TABLE "Professional" ADD COLUMN     "customHours" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ProfessionalHour" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "startMinutes" INTEGER NOT NULL,
    "endMinutes" INTEGER NOT NULL,
    "breakStart" INTEGER,
    "breakEnd" INTEGER,

    CONSTRAINT "ProfessionalHour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeBlock" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "professionalId" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'ONCE',
    "date" TEXT NOT NULL,
    "endDate" TEXT,
    "weekday" INTEGER,
    "startMinutes" INTEGER,
    "endMinutes" INTEGER,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalHour_professionalId_weekday_key" ON "ProfessionalHour"("professionalId", "weekday");

-- CreateIndex
CREATE INDEX "TimeBlock_businessId_date_idx" ON "TimeBlock"("businessId", "date");

-- AddForeignKey
ALTER TABLE "ProfessionalHour" ADD CONSTRAINT "ProfessionalHour_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeBlock" ADD CONSTRAINT "TimeBlock_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeBlock" ADD CONSTRAINT "TimeBlock_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Segurança (Supabase): tabelas novas com RLS ligado, como as demais (o sistema acessa como dono do banco)
ALTER TABLE "ProfessionalHour" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TimeBlock" ENABLE ROW LEVEL SECURITY;
