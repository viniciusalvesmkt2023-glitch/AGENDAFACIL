import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar — HoraBoa" };

export default async function LoginPage() {
  // login salvo: quem já está conectado vai direto para o painel
  if (await getCurrentUser()) redirect("/painel");
  return <LoginForm />;
}
