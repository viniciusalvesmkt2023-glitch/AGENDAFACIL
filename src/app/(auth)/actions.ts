"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth";
import { slugify } from "@/lib/format";
import { RESERVED_SLUGS } from "@/lib/brand";
import { TRIAL_DAYS } from "@/lib/plans";

export type FormState = { error?: string | null; values?: Record<string, string> } | undefined;

/** Valores digitados (exceto senha), para não apagar o formulário quando houver erro. */
function keep(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string" && !k.startsWith("$") && k !== "password") values[k] = v;
  return values;
}

// Rotas do sistema que não podem ser usadas como endereço de estabelecimento

const signupSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome."),
  businessName: z.string().trim().min(2, "Informe o nome do estabelecimento."),
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
  acceptTerms: z.literal("on", { message: "É preciso aceitar os Termos de Uso e a Política de Privacidade." }),
});

async function uniqueSlug(base: string) {
  let slug = base || "meu-negocio";
  if (RESERVED_SLUGS.has(slug)) slug = `${slug}-1`;
  let i = 1;
  while (await db.business.findUnique({ where: { slug } })) {
    i += 1;
    slug = `${base}-${i}`;
  }
  return slug;
}

export async function signup(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message, values: keep(formData) };
  const { name, businessName, email, password } = parsed.data;

  if (await db.user.findUnique({ where: { email } })) {
    return { error: "Já existe uma conta com este e-mail.", values: keep(formData) };
  }

  const slug = await uniqueSlug(slugify(businessName));
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await db.$transaction(async (tx) => {
    const business = await tx.business.create({
      data: {
        name: businessName,
        // Link provisório: o dono escolhe o definitivo no passo 2 da configuração
        slug,
        trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 86_400_000),
        // Horário padrão: seg a sex 9h-19h (almoço 12h-13h), sábado 9h-14h, domingo fechado
        workingHours: {
          create: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
            weekday,
            isOpen: weekday !== 0,
            startMinutes: 9 * 60,
            endMinutes: weekday === 6 ? 14 * 60 : 19 * 60,
            breakStart: weekday === 6 ? null : 12 * 60,
            breakEnd: weekday === 6 ? null : 13 * 60,
          })),
        },
      },
    });
    // O dono já entra como primeiro profissional
    await tx.professional.create({ data: { businessId: business.id, name } });
    return tx.user.create({ data: { name, email, passwordHash, businessId: business.id, termsAcceptedAt: new Date() } });
  });

  await createSession({ userId: user.id, businessId: user.businessId, sessionVersion: user.sessionVersion });
  // Abre a configuração guiada (5 passos)
  redirect("/comecar");
}

const MAX_FAILED_LOGINS = 8;
const LOCK_MINUTES = 15;

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  password: z.string().min(1, "Informe sua senha."),
});

export async function login(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message, values: keep(formData) };

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    const min = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
    return { error: `Muitas tentativas erradas. Tente de novo em ${min} minuto${min === 1 ? "" : "s"} ou use “Esqueci minha senha”.`, values: keep(formData) };
  }
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    if (user) {
      // a cada 8 erros seguidos, trava por 15 minutos
      const failed = user.failedLogins + 1;
      await db.user.update({
        where: { id: user.id },
        data: failed >= MAX_FAILED_LOGINS ? { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) } : { failedLogins: failed },
      });
    }
    return { error: "E-mail ou senha incorretos.", values: keep(formData) };
  }
  if (user.failedLogins || user.lockedUntil) await db.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });

  // "Manter conectado neste aparelho" vem marcado; desmarcado, o login some ao fechar o navegador
  const remember = formData.get("remember") === "on";
  await createSession({ userId: user.id, businessId: user.businessId, sessionVersion: user.sessionVersion, remember });
  redirect("/painel");
}

export async function logout() {
  await destroySession();
  redirect("/entrar");
}
