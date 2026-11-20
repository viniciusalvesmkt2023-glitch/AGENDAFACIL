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

## Stack

- [Next.js](https://nextjs.org) (App Router, Server Actions) + React + TypeScript
- [Prisma](https://www.prisma.io) — SQLite em desenvolvimento, PostgreSQL em produção
- Tailwind CSS
- Autenticação própria com sessão em cookie JWT (`jose`) e senhas com `bcryptjs`
- Testes com Vitest

## Como rodar

```bash
npm install
cp .env.example .env        # edite AUTH_SECRET
npx prisma db push          # cria o banco
npm run db:seed             # (opcional) cria a demo /barbearia-demo
npm run dev
```

Acesse http://localhost:3000. Login da demo: `demo@agendafacil.com` / `demo1234`.

Outros comandos: `npm test` (testes), `npm run typecheck`, `npm run build`, `npm run db:studio` (visualizar o banco).

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

## Deploy em produção

1. Crie um banco PostgreSQL (Neon, Supabase, Railway...).
2. Em `prisma/schema.prisma`, troque `provider = "sqlite"` por `provider = "postgresql"`.
3. Configure `DATABASE_URL` e `AUTH_SECRET` na hospedagem (ex.: Vercel) e rode `npx prisma db push` (ou migrations).

## Próximos passos (roadmap)

- [ ] **Lembretes automáticos no WhatsApp** (API oficial do WhatsApp Business / Z-API / Evolution API) — ex.: 24h e 2h antes
- [ ] Confirmação automática por resposta do cliente
- [ ] Horários e folgas por profissional + bloqueios de agenda (feriados, férias)
- [ ] Planos e cobrança recorrente do SaaS (Stripe / Asaas / Mercado Pago)
- [ ] Pagamento antecipado / sinal no agendamento (Pix)
- [ ] Relatórios: faturamento, serviços mais vendidos, taxa de faltas
- [ ] Vários usuários por estabelecimento (recepcionista, profissional com acesso só à própria agenda)
- [ ] Recuperação de senha por e-mail
- [ ] Logo e cores personalizadas na página pública
- [ ] Lista de espera e reagendamento pelo cliente
