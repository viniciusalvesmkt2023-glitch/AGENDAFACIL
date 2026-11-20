import { APP_NAME, SUPPORT_EMAIL } from "@/lib/brand";
import { LegalPage } from "@/components/legal-page";

export const metadata = { title: `Política de Privacidade — ${APP_NAME}` };

export default function PrivacyPage() {
  return (
    <LegalPage title="Política de Privacidade" updated="20 de novembro de 2026">
      <p>
        Esta Política explica como o {APP_NAME} trata dados pessoais, em conformidade com a Lei Geral de Proteção de Dados
        (LGPD — Lei 13.709/2018).
      </p>

      <h2>1. Quais dados tratamos</h2>
      <ul>
        <li><strong>Donos e equipe dos Estabelecimentos:</strong> nome, e-mail, telefone, CPF/CNPJ (para pagamento) e dados de uso da plataforma.</li>
        <li><strong>Clientes dos Estabelecimentos:</strong> nome, telefone/WhatsApp, horários agendados, serviços e observações informadas no agendamento.</li>
        <li><strong>Pagamentos:</strong> os dados de cartão são processados diretamente pela Stripe e os pagamentos Pix pelo provedor de pagamento; não armazenamos números de cartão.</li>
      </ul>

      <h2>2. Para que usamos</h2>
      <ul>
        <li>Realizar e gerenciar agendamentos.</li>
        <li>Enviar confirmações e lembretes de horário por WhatsApp e comunicações sobre a conta por e-mail.</li>
        <li>Cobrar a assinatura do Estabelecimento e cumprir obrigações legais e fiscais.</li>
        <li>Manter a segurança e melhorar a plataforma.</li>
      </ul>

      <h2>3. Papéis (controlador e operador)</h2>
      <p>
        Para os dados dos clientes finais, o <strong>Estabelecimento</strong> em que o agendamento é feito é o controlador, e o{" "}
        {APP_NAME} é o operador, tratando os dados em nome do Estabelecimento. Para os dados de cadastro dos Estabelecimentos,
        o {APP_NAME} é o controlador.
      </p>

      <h2>4. Bases legais</h2>
      <p>
        Execução de contrato (realizar o agendamento e prestar o serviço contratado), cumprimento de obrigação legal e
        legítimo interesse (lembretes para evitar faltas e segurança da plataforma).
      </p>

      <h2>5. Compartilhamento</h2>
      <p>
        Compartilhamos dados apenas com fornecedores necessários ao serviço: hospedagem (Vercel), banco de dados (Supabase),
        envio de mensagens (Meta/WhatsApp), envio de e-mails (Resend) e pagamentos (Stripe e provedor Pix). Não vendemos dados pessoais.
      </p>

      <h2>6. Retenção e segurança</h2>
      <p>
        Mantemos os dados enquanto a conta estiver ativa ou pelo tempo exigido por lei. Usamos conexões criptografadas,
        senhas armazenadas com hash e controle de acesso por estabelecimento.
      </p>

      <h2>7. Seus direitos</h2>
      <p>
        Você pode solicitar acesso, correção, anonimização, portabilidade ou exclusão dos seus dados, além de informações
        sobre o compartilhamento. Clientes finais podem fazer o pedido diretamente ao Estabelecimento ou a nós, que o
        encaminharemos. Contato: <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand-600 underline">{SUPPORT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
