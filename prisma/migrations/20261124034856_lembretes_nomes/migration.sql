-- Lembretes agora são configuráveis: nomes genéricos (antecipado / curto)
ALTER TABLE "Appointment" RENAME COLUMN "reminder24hSentAt" TO "reminderDaySentAt";
ALTER TABLE "Appointment" RENAME COLUMN "reminder1hSentAt" TO "reminderShortSentAt";
UPDATE "MessageLog" SET "type" = 'REMINDER_DAY' WHERE "type" = 'REMINDER_24H';
UPDATE "MessageLog" SET "type" = 'REMINDER_SHORT' WHERE "type" = 'REMINDER_1H';
