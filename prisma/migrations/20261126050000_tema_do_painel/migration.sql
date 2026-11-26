-- Tema do painel (claro/escuro), escolhido por cada usuário
ALTER TABLE "User" ADD COLUMN "panelTheme" TEXT NOT NULL DEFAULT 'LIGHT';
