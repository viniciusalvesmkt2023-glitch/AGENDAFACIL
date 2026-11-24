-- Lembrete curto passa de 2h para 1h antes do horário
ALTER TABLE "Appointment" RENAME COLUMN "reminder2hSentAt" TO "reminder1hSentAt";
UPDATE "MessageLog" SET "type" = 'REMINDER_1H' WHERE "type" = 'REMINDER_2H';
