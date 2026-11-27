-- Agenda salva na conta, comissão do profissional, taxas por forma de pagamento, despesas e quem vendeu o produto
ALTER TABLE "User" ADD COLUMN "agendaView" TEXT NOT NULL DEFAULT 'dia',
ADD COLUMN "agendaProfessional" TEXT,
ADD COLUMN "agendaShowCanceled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Business" ADD COLUMN "feePixBps" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "feeCashBps" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "feeDebitBps" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "feeCreditBps" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Professional" ADD COLUMN "commissionType" TEXT NOT NULL DEFAULT 'NONE',
ADD COLUMN "commissionRate" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "productCommissionBps" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "StockMove" ADD COLUMN "costCents" INTEGER,
ADD COLUMN "professionalId" TEXT;
ALTER TABLE "StockMove" ADD CONSTRAINT "StockMove_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "endDate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Expense_businessId_date_idx" ON "Expense"("businessId", "date");
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Expense" ENABLE ROW LEVEL SECURITY;
