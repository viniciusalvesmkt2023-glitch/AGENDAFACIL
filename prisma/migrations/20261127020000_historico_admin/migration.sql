-- Histórico do que o admin fez na conta de cada cliente
CREATE TABLE "AdminAction" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "adminEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminAction_businessId_createdAt_idx" ON "AdminAction"("businessId", "createdAt");

ALTER TABLE "AdminAction" ADD CONSTRAINT "AdminAction_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AdminAction" ENABLE ROW LEVEL SECURITY;
