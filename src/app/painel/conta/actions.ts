"use server";
import { isAdminEmail } from "@/lib/admin";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroySession, getSession, requireUser } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { cancelAsaasSubscription } from "@/lib/pix/asaas-billing";
import { deleteInstance, logoutInstance } from "@/lib/evolution";

export type AccountState = { error?: string | null; success?: string | null } | undefined;

export async function updateProfile(_: AccountState, formData: FormData): Promise<AccountState> {
  const user = await requireUser();
  const parsed = z
    .object({
      name: z.string().trim().min(2, "Informe seu nome.").max(80),
      email: z.string().trim().toLowerCase().email("E-mail inválido."),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email } = parsed.data;
  if (email !== user.email) {
    // trocar o e-mail de acesso pede a senha atual
    if (!(await bcrypt.compare(String(formData.get("current") ?? ""), user.passwordHash))) {
      return { error: "Para trocar o e-mail, informe sua senha atual." };
    }
    if (isAdminEmail(email) || (await db.user.findUnique({ where: { email } }))) {
      return { error: "Já existe uma conta com este e-mail." };
    }
  }
  await db.user.update({ where: { id: user.id }, data: { name, email } });
  revalidatePath("/painel", "layout");
  return { success: "Dados salvos." };
}

export async function changePassword(_: AccountState, formData: FormData): Promise<AccountState> {
  const user = await requireUser();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (!(await bcrypt.compare(current, user.passwordHash))) return { error: "A senha atual está incorreta." };
  if (next.length < 8) return { error: "A nova senha precisa ter pelo menos 8 caracteres." };
  if (next !== confirm) return { error: "A confirmação não é igual à nova senha." };
  if (next === current) return { error: "A nova senha precisa ser diferente da atual." };
  const remember = (await getSession())?.remember ?? true;
  // Senha nova desconecta os outros aparelhos; este continua conectado
  const updated = await db.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(next, 10), sessionVersion: { increment: 1 } } });
  await createSession({ userId: updated.id, businessId: updated.businessId, sessionVersion: updated.sessionVersion, remember });
  // Links de "esqueci minha senha" antigos deixam de valer
  await db.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
  return { success: "Senha alterada. Os outros aparelhos foram desconectados." };
}

/** Exclui a conta e todos os dados do estabelecimento (LGPD). Cancela as cobranças antes. */
export async function deleteAccount(_: AccountState, formData: FormData): Promise<AccountState> {
  const user = await requireUser();
  const b = user.business;
  if (String(formData.get("confirm") ?? "").trim().toUpperCase() !== "EXCLUIR") return { error: "Digite EXCLUIR para confirmar." };
  if (!(await bcrypt.compare(String(formData.get("password") ?? ""), user.passwordHash))) return { error: "Senha incorreta." };

  // Para de cobrar antes de apagar (se falhar, não apaga, para não deixar cobrança órfã)
  try {
    const stripe = getStripe();
    if (stripe && b.stripeSubscriptionId) {
      await stripe.subscriptions.cancel(b.stripeSubscriptionId).catch((e: { code?: string }) => {
        if (e?.code !== "resource_missing") throw e;
      });
    }
    if (b.asaasSubscriptionId) await cancelAsaasSubscription(b, true);
  } catch (e) {
    console.error("[conta] erro ao cancelar assinatura antes de excluir", e);
    return { error: "Não conseguimos cancelar sua assinatura agora. Tente de novo em alguns minutos ou fale com o suporte." };
  }
  if (b.whatsappInstance) {
    await logoutInstance(b.whatsappInstance);
    await deleteInstance(b.whatsappInstance);
  }

  // Apaga o estabelecimento; usuários, clientes, agendamentos etc. vão junto (cascade)
  await db.business.delete({ where: { id: b.id } });
  await destroySession();
  redirect("/?conta=excluida");
}
