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
        <h1 className="text-2xl font-extrabold">Link inválido ou expirado</h1>
        <p className="mt-2 text-sm text-zinc-500">Peça um novo link para redefinir sua senha.</p>
        <Link href="/esqueci-senha" className="btn-primary mt-6 w-full">Pedir novo link</Link>
      </>
    );
  }
  return (
    <>
      <h1 className="text-2xl font-extrabold">Criar nova senha</h1>
      <p className="mt-1 text-sm text-zinc-500">Escolha uma senha com pelo menos 8 caracteres.</p>
      <ResetForm token={token} />
    </>
  );
}
