-- Controle de pagamento do atendimento (a receber / pago e a forma)
ALTER TABLE "Appointment" ADD COLUMN "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN "paymentMethod" TEXT,
ADD COLUMN "paidAt" TIMESTAMP(3);

CREATE INDEX "Appointment_businessId_paymentStatus_idx" ON "Appointment"("businessId", "paymentStatus");
