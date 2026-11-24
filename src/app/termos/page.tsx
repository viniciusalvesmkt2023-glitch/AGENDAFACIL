import { APP_NAME, SUPPORT_EMAIL } from "@/lib/brand";
import { LegalPage } from "@/components/legal-page";
import { PLAN_LIST } from "@/lib/plans";
import { formatMoney } from "@/lib/format";
import { TRIAL_DAYS } from "@/lib/plans";

export const metadata = { title: `Termos de Uso — ${APP_NAME}` };

export default function TermsPage() {
  return (
    <LegalPage title="Termos de Uso" updated="20 de novembro de 2026">
      <p>
        Estes Termos regulam o uso do {APP_NAME}, plataforma de agendamento online para estabelecimentos que atendem com
        horário marcado (“Estabelecimentos”). Ao criar uma conta, você declara ter lido e concordado com estes Termos e com
        a nossa <a href="/privacidade" className="text-brand-600 underline">Política de Privacidade</a>.
      </p>

      <h2>1. O serviço</h2>
      <p>
        O {APP_NAME} oferece agenda online, página pública de agendamento, cadastro de serviços, profissionais e clientes,
        e envio de mensagens automáticas (confirmações e lembretes). Funcionalidades podem ser adicionadas, alteradas ou
        removidas para melhoria do serviço.
      </p>

      <h2>2. Conta e responsabilidades</h2>
      <ul>
        <li>Você é responsável pela veracidade dos dados informados e pela guarda da sua senha.</li>
        <li>Você é responsável pelas informações que cadastra (serviços, preços, horários) e pelo atendimento aos seus clientes.</li>
        <li>É proibido usar a plataforma para fins ilícitos, envio de spam ou violação de direitos de terceiros.</li>
      </ul>

      <h2>3. Mensagens pelo WhatsApp</h2>
      <p>
        O envio automático de confirmações e lembretes usa o WhatsApp do próprio Estabelecimento, conectado por QR code
        por meio de uma integração não oficial. O Estabelecimento declara estar ciente de que o WhatsApp pode restringir
        ou bloquear números conforme suas próprias regras, e que o {APP_NAME} não se responsabiliza por eventuais
        bloqueios. Recomendamos não utilizar o número para envio de mensagens em massa ou publicidade.
      </p>

      <h2>4. Teste grátis, planos e pagamento</h2>
      <p>
        Novas contas têm {TRIAL_DAYS} dias de teste grátis, sem compromisso. Após o teste, o uso depende da contratação de
        um plano: {PLAN_LIST.map((p) => `${p.name} (${formatMoney(p.priceCents)})`).join(", ")}.
      </p>
      <ul>
        <li>No cartão de crédito, a cobrança é recorrente e automática ao fim de cada período, até o cancelamento.</li>
        <li>No Pix, o pagamento é feito a cada período; sem pagamento, o acesso é suspenso após o vencimento.</li>
        <li>Há uma tolerância de 3 dias após o vencimento antes da suspensão. Os dados são mantidos durante a suspensão.</li>
        <li>Os preços podem ser reajustados mediante aviso prévio de 30 dias.</li>
      </ul>

      <h2>5. Cancelamento</h2>
      <p>
        Você pode cancelar a qualquer momento pelo painel. O acesso continua até o fim do período já pago. Não há reembolso
        proporcional de períodos em andamento, exceto nos casos previstos no Código de Defesa do Consumidor (como o direito
        de arrependimento em até 7 dias da primeira contratação).
      </p>

      <h2>6. Disponibilidade</h2>
      <p>
        Empregamos esforços para manter a plataforma disponível e segura, mas podem ocorrer interrupções para manutenção ou
        por fatores fora do nosso controle. Não nos responsabilizamos por prejuízos indiretos decorrentes de indisponibilidade.
      </p>

      <h2>7. Dados pessoais</h2>
      <p>
        Em relação aos dados dos clientes finais do Estabelecimento, o Estabelecimento é o <strong>controlador</strong> e o{" "}
        {APP_NAME} atua como <strong>operador</strong>, tratando os dados apenas para prestar o serviço, conforme a Lei
        Geral de Proteção de Dados (Lei 13.709/2018). Detalhes na Política de Privacidade.
      </p>

      <h2>8. Contato</h2>
      <p>Dúvidas sobre estes Termos: <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand-600 underline">{SUPPORT_EMAIL}</a>.</p>
    </LegalPage>
  );
}
