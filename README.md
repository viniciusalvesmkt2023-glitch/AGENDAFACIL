# AgendaFácil

SaaS de agendamento online para **barbearias, salões de beleza, clínicas de estética** e qualquer negócio que atende com horário marcado.

Cada estabelecimento ganha um painel de gestão e uma página pública de agendamento (ex.: `agendafacil.com/barbearia-do-joao`), onde os clientes marcam horário sozinhos, 24h por dia.

## Telas

| Painel do estabelecimento | Agendamento pelo cliente (celular) |
|---|---|
| ![Agenda](docs/telas/2-painel-agenda.png) | ![Cliente](docs/telas/5-celular-cliente-horarios.png) |

## Funcionalidades (MVP)

**Para o cliente final (página pública `/[slug]`)**
- Escolhe serviço → profissional (ou "sem preferência") → data → horário
- Só aparecem horários realmente livres (considera duração do serviço, intervalo de almoço, agenda de cada profissional, antecedência mínima)
- Página de confirmação com link para consultar/cancelar o agendamento

**Para o estabelecimento (`/painel`)**
- Agenda do dia com navegação por data e filtro por profissional
- Ações: confirmar, concluir, marcar falta, cancelar, reabrir
- Botão de WhatsApp com mensagem de confirmação pronta
- Agendamento manual (cliente que liga ou chega sem horário)
- Cadastro de serviços (duração e preço) e profissionais (quais serviços cada um faz)
- Horário de funcionamento por dia da semana, com intervalo
- Base de clientes criada automaticamente (visitas, último atendimento, total gasto)
- Regras: intervalo entre horários, antecedência mínima, até quantos dias à frente aceitar agendamentos

**Multiempresa (multi-tenant):** cada conta só enxerga os dados do próprio estabelecimento.

**Também incluído:** assinatura com teste grátis, pagamento por cartão (Stripe) e Pix, lembretes automáticos no WhatsApp, recuperação de senha por e-mail e páginas de LGPD — detalhes abaixo.

## Stack

- [Next.js](https://nextjs.org) (App Router, Server Actions) + React + TypeScript
- [Prisma](https://www.prisma.io) + PostgreSQL no [Supabase](https://supabase.com)
- Tailwind CSS
- Autenticação própria com sessão em cookie JWT (`jose`) e senhas com `bcryptjs`
- Testes com Vitest

## Como rodar

### 1. Crie o banco no Supabase
1. Crie uma conta em https://supabase.com e clique em **New project**.
2. Dê um nome, **anote a senha do banco** (Database Password) e escolha a região **South America (São Paulo)**.
3. Com o projeto criado, clique em **Connect** (no topo) → aba **ORMs** → **Prisma**.
4. Copie as duas linhas `DATABASE_URL` e `DIRECT_URL`.

### 2. Configure e rode o projeto
```bash
npm install
cp .env.example .env        # no Windows: copy .env.example .env
```
Abra o arquivo `.env`, cole as duas URLs do Supabase (trocando `[YOUR-PASSWORD]` pela senha do banco) e troque o `AUTH_SECRET` por um texto longo qualquer. Depois:
```bash
npm run db:migrate          # cria as tabelas no Supabase
npm run db:seed             # (opcional) cria a demo /barbearia-demo
npm run dev
```

Acesse http://localhost:3000. Login da demo: `demo@agendafacil.com` / `demo1234`.

As tabelas e os dados podem ser vistos no Supabase em **Table Editor**, ou com `npm run db:studio`.

Outros comandos: `npm test` (testes), `npm run typecheck`, `npm run build`.

**Alterando o banco:** depois de mudar `prisma/schema.prisma`, rode `npx prisma migrate dev --name descricao-da-mudanca` para gerar uma nova migration e `npm run db:migrate` para aplicá-la no Supabase.

## Estrutura

```
prisma/schema.prisma          Modelo de dados (Business, User, Service, Professional, WorkingHour, Client, Appointment)
src/lib/availability.ts       Motor de disponibilidade (funções puras, testadas)
src/lib/booking.ts            Cálculo de horários e criação de agendamento em transação (evita horário duplicado)
src/lib/auth.ts               Sessão / login
src/app/[slug]/               Página pública de agendamento
src/app/agendamento/[token]/  Consulta e cancelamento pelo cliente
src/app/painel/               Painel do estabelecimento
src/app/api/disponibilidade/  API de horários livres
```

Datas são guardadas como `YYYY-MM-DD` e horários como minutos desde 00:00, no fuso do estabelecimento (`APP_TIMEZONE`), evitando bugs de fuso horário.

## Deploy em produção (Vercel + Supabase)

1. Importe o repositório na [Vercel](https://vercel.com).
2. Em **Environment Variables**, cadastre `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET` e `APP_TIMEZONE` (os mesmos valores do `.env`).
3. Faça o deploy. O build roda `prisma migrate deploy`, que cria/atualiza as tabelas no Supabase automaticamente.

## Assinatura e pagamentos

- **Teste grátis de 7 dias** em toda conta nova. Ao fim, o painel e a página pública ficam bloqueados até assinar (com 3 dias de tolerância após um vencimento).
- **Planos** (em `src/lib/plans.ts`): Mensal R$ 37,90 · Semestral R$ 197,40 (R$ 32,90/mês) · Anual R$ 334,80 (R$ 27,90/mês).
- **Cartão (Stripe):** checkout em modo assinatura, renovação automática, portal para trocar cartão/cancelar.
  1. Crie a conta em https://stripe.com e copie a *Secret key* para `STRIPE_SECRET_KEY`.
  2. Em *Developers → Webhooks*, adicione o endpoint `https://SEU-DOMINIO/api/webhooks/stripe` com os eventos
     `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`,
     `customer.subscription.deleted` e `invoice.paid`. Copie o *Signing secret* para `STRIPE_WEBHOOK_SECRET`.
  3. Em *Settings → Billing → Customer portal*, salve a configuração do portal (permitir cancelar e atualizar cartão).
- **Pix (SyncPay):** tela com QR code e copia e cola, liberação automática via webhook `https://SEU-DOMINIO/api/webhooks/pix`.
  A integração com a API da SyncPay fica em `src/lib/pix/syncpay.ts` (**pendente** da documentação oficial).
  Para testar localmente, use `PIX_PROVIDER="mock"`.

## Lembretes no WhatsApp

Confirmação ao agendar e lembretes 24h e 2h antes, pela **API oficial do WhatsApp (Meta Cloud API)**, com um número da plataforma.

1. Em https://business.facebook.com crie um app do tipo *Business* com o produto **WhatsApp** e adicione o número da plataforma.
2. Gere um token permanente (usuário do sistema) → `WHATSAPP_TOKEN`; copie o *Phone number ID* → `WHATSAPP_PHONE_NUMBER_ID`.
3. Em *WhatsApp Manager → Modelos de mensagem*, crie dois modelos, categoria **Utilidade**, idioma **Português (BR)**:

   **`agendamento_confirmado`**
   ```
   Olá, {{1}}! Seu horário em *{{2}}* está confirmado para {{3}}.

   Serviço: {{4}} com {{5}}

   Para ver ou cancelar seu agendamento: {{6}}

   Até lá!
   ```
   **`lembrete_agendamento`**
   ```
   Olá, {{1}}! Passando para lembrar do seu horário em *{{2}}* {{3}}.

   Serviço: {{4}} com {{5}}

   Se não puder comparecer, cancele por aqui: {{6}}

   Obrigado!
   ```
   Parâmetros: 1 = primeiro nome do cliente, 2 = estabelecimento, 3 = quando (ex.: "amanhã às 14:00"), 4 = serviço, 5 = profissional, 6 = link.
4. Agende uma chamada a cada **15 minutos** para `GET https://SEU-DOMINIO/api/cron/lembretes` com o cabeçalho
   `Authorization: Bearer <CRON_SECRET>`:
   - no plano **Pro** da Vercel, com *Vercel Cron* (`vercel.json`);
   - no plano grátis (Hobby, que só permite cron diário), com https://cron-job.org (grátis).

Cada estabelecimento pode ligar/desligar as mensagens em *Configurações*, onde também vê o histórico de envios.

## E-mail (recuperação de senha)

Usa a [Resend](https://resend.com) com o domínio `horaboa.com`: crie a conta, adicione o domínio em *Domains*,
cadastre os registros DNS indicados e copie a API key para `RESEND_API_KEY`.

## LGPD

Páginas `/termos` e `/privacidade`, aceite obrigatório no cadastro e aviso no agendamento do cliente.
Os textos são um ponto de partida — **revise com um advogado** antes de vender.

## Próximos passos (roadmap)

- [ ] Concluir a integração Pix da SyncPay e o Pix Automático (renovação automática no Pix)
- [ ] Aviso ao dono (WhatsApp/e-mail) antes do vencimento do plano no Pix
- [ ] Horários e folgas por profissional + bloqueios de agenda (feriados, férias)
- [ ] Vários usuários por estabelecimento (recepcionista, profissional com acesso só à própria agenda)
- [ ] Relatórios: faturamento, serviços mais vendidos, taxa de faltas
- [ ] Logo e cores personalizadas na página pública
- [ ] Lista de espera e reagendamento pelo cliente
- [ ] Monitoramento de erros (ex.: Sentry)
