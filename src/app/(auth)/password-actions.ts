"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { generateToken, hashToken } from "@/lib/tokens";
import { appUrl, APP_NAME } from "@/lib/brand";

export type ResetState = { error?: string | null; success?: string | null } | undefined;

const TOKEN_TTL_MINUTES = 60;
const GENERIC_MESSAGE =
  "Se existir uma conta com este e-mail, você receberá um link para criar uma nova senha em alguns minutos. Confira também a caixa de spam.";

export async function requestPasswordReset(_: ResetState, formData: FormData): Promise<ResetState> {
  const parsed = z.string().trim().toLowerCase().email().safeParse(formData.get("email"));
  if (!parsed.success) return { error: "Informe um e-mail válido." };

  const user = await db.user.findUnique({ where: { email: parsed.data } });
  // Mesma resposta exista ou não a conta, para não revelar quais e-mails estão cadastrados
  if (!user) return { success: GENERIC_MESSAGE };

  // Limite: no máximo 3 pedidos por hora
  const recent = await db.passwordResetToken.count({
    where: { userId: user.id, createdAt: { gt: new Date(Date.now() - 60 * 60_000) } },
  });
  if (recent >= 3) return { success: GENERIC_MESSAGE };

  const token = generateToken();
  await db.passwordResetToken.create({
    data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + TOKEN_TTL_MINUTES * 60_000) },
  });

  const link = `${appUrl()}/redefinir-senha/${token}`;
  await sendEmail({
    to: user.email,
    subject: `Redefinição de senha — ${APP_NAME}`,
    text: `Olá, ${user.name.split(" ")[0]}!\n\nRecebemos um pedido para redefinir a senha da sua conta no ${APP_NAME}.\nPara criar uma nova senha, acesse: ${link}\n\nO link vale por ${TOKEN_TTL_MINUTES} minutos. Se não foi você, ignore este e-mail.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#18181b">
        <h2 style="font-family:Arial,sans-serif;margin:0 0 16px"><span style="color:#15233e">Hora</span><span style="color:#fe6e02">Boa</span></h2>
        <p>Olá, ${escapeHtml(user.name.split(" ")[0])}!</p>
        <p>Recebemos um pedido para redefinir a senha da sua conta.</p>
        <p style="margin:28px 0">
          <a href="${link}" style="background:#e85f00;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Criar nova senha</a>
        </p>
        <p style="color:#71717a;font-size:13px">O link vale por ${TOKEN_TTL_MINUTES} minutos. Se não foi você, ignore este e-mail — sua senha continua a mesma.</p>
      </div>`,
  });
  return { success: GENERIC_MESSAGE };
}

export async function resetPassword(_: ResetState, formData: FormData): Promise<ResetState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres." };
  if (password !== confirm) return { error: "As senhas não conferem." };

  const record = await db.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { error: "Este link é inválido ou expirou. Peça um novo." };
  }

  const [updated] = await db.$transaction([
    // nova senha: os outros aparelhos com login salvo são desconectados
    db.user.update({ where: { id: record.userId }, data: { passwordHash: await bcrypt.hash(password, 10), sessionVersion: { increment: 1 } } }),
    db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    // Invalida outros links pendentes
    db.passwordResetToken.deleteMany({ where: { userId: record.userId, usedAt: null, id: { not: record.id } } }),
  ]);

  await createSession({ userId: updated.id, businessId: updated.businessId, sessionVersion: updated.sessionVersion });
  redirect("/painel");
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
