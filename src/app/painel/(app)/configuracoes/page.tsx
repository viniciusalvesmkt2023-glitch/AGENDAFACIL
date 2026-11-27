import { requireActiveUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const user = await requireActiveUser();
  const b = user.business;
  return (
    <>
      <PageHeader title="Configurações" description="Informações do estabelecimento e regras do agendamento online." />
      <SettingsForm
        business={{
          ...b,
          address: {
            address: b.address,
            homeService: b.homeService,
            zipCode: b.zipCode,
            street: b.street,
            addressNumber: b.addressNumber,
            complement: b.complement,
            district: b.district,
            city: b.city,
            state: b.state,
          },
        }}
      />
    </>
  );
}
