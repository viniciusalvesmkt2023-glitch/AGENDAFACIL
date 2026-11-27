-- Configurações gerais do site (painel admin)
CREATE TABLE "SiteSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
);

-- Só o servidor acessa (mesmo padrão das outras tabelas)
ALTER TABLE "SiteSetting" ENABLE ROW LEVEL SECURITY;
