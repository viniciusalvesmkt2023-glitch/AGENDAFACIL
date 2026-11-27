-- Login salvo: versão da sessão (trocar a senha desconecta os outros aparelhos)
ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
