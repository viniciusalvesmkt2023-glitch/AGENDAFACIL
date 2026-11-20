import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader title="Configurações" description="Informações do estabelecimento e regras do agendamento online." />
      <SettingsForm business={user.business} />
    </>
  );
}
