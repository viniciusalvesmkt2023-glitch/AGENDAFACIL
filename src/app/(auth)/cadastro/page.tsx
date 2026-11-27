import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Criar conta — HoraBoa" };

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/painel");
  return <SignupForm />;
}
