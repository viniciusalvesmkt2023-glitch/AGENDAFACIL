import Link from "next/link";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/tokens";
import { ResetForm } from "./reset-form";

type Props = { params: Promise<{ token: string }> };

export default async function ResetPasswordPage({ params }: Props) {
  const { token } = await params;
  const record = await db.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  const valid = record && !record.usedAt && record.expiresAt > new Date();

  if (!valid) {
    return (
      <>
        <h1>Link inválido ou expirado</h1>
        <p className="au-sub">Peça um novo link para redefinir sua senha.</p>
        <Link href="/esqueci-senha" className="au-alt">Pedir novo link</Link>
        <Link href="/entrar" className="au-back">← Voltar para o login</Link>
      </>
    );
  }
  return (
    <>
      <h1>Criar nova senha</h1>
      <p className="au-sub">Escolha uma senha com pelo menos 8 caracteres.</p>
      <ResetForm token={token} />
    </>
  );
}
