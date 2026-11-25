import Link from "next/link";
import { ChevronRight, FileText, KeyRound, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { DeleteAccountForm, PasswordForm, ProfileForm } from "./forms";

function Section({ icon, title, children, tone = "navy" }: { icon: React.ReactNode; title: string; children: React.ReactNode; tone?: "navy" | "red" }) {
  return (
    <section className="card p-4 md:p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className={`grid h-10 w-10 place-items-center rounded-xl ${tone === "red" ? "bg-red-50 text-red-600" : "bg-navy-50 text-navy-700"}`}>{icon}</span>
        <h2 className="text-lg font-bold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader title="Minha conta" description="Seus dados de acesso, senha e privacidade." />
      <div className="space-y-4">
        <Section icon={<UserRound className="h-5 w-5" />} title="Dados pessoais">
          <ProfileForm name={user.name} email={user.email} />
        </Section>
        <Section icon={<KeyRound className="h-5 w-5" />} title="Alterar senha">
          <PasswordForm />
        </Section>
        <Section icon={<ShieldCheck className="h-5 w-5" />} title="Privacidade">
          <ul className="-mx-1 divide-y divide-zinc-100">
            {[
              { href: "/privacidade", label: "Política de Privacidade" },
              { href: "/termos", label: "Termos de Uso" },
            ].map((l) => (
              <li key={l.href}>
                <Link href={l.href} target="_blank" className="flex items-center gap-3 rounded-lg px-1 py-3 text-sm font-medium text-navy-900 hover:bg-zinc-50">
                  <FileText className="h-4 w-4 text-zinc-400" />
                  <span className="flex-1">{l.label}</span>
                  <ChevronRight className="h-4 w-4 text-zinc-300" />
                </Link>
              </li>
            ))}
          </ul>
        </Section>
        <details className="card group p-4 md:p-5">
          <summary className="flex cursor-pointer list-none items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-red-50 text-red-600">
              <Trash2 className="h-5 w-5" />
            </span>
            <span className="flex-1 text-lg font-bold text-red-700">Excluir conta</span>
            <ChevronRight className="h-5 w-5 text-zinc-300 transition group-open:rotate-90" />
          </summary>
          <div className="mt-4">
            <DeleteAccountForm businessName={user.business.name} />
          </div>
        </details>
      </div>
    </>
  );
}
