-- Segurança (Supabase): ativa Row Level Security em todas as tabelas, sem nenhuma política.
-- Efeito: a API pública do Supabase (chaves anon/authenticated) não consegue ler nem gravar nada.
-- O sistema continua funcionando porque se conecta como dono das tabelas (usuário postgres),
-- que não é afetado pelo RLS.
ALTER TABLE "Business" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PasswordResetToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Service" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Professional" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProfessionalService" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkingHour" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Client" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Appointment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MessageLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
