# NexoDesk AI

Plataforma inteligente de operação comercial para empresas de desenvolvimento e serviços digitais. Integra WhatsApp, CRM, propostas, vendas, projetos, financeiro, agenda e automações num único painel, com uma camada de IA local (Ollama) analisando conversas e respondendo perguntas sobre o negócio a partir de dados reais.

## Overview

Quando um novo contato chega pelo WhatsApp, o NexoDesk identifica o número, evita duplicidade, cria automaticamente um lead, dispara uma análise de IA e mantém tudo sincronizado em tempo real no painel — do primeiro "oi" até o pagamento da última parcela do projeto.

```
WhatsApp → Lead → CRM → Qualificação → Proposta → Venda → Cliente → Projeto → Financeiro → Agenda → Entrega
```

## Features

- **Inbox do WhatsApp** — conversas em tempo real, sugestões de resposta por IA, painel do contato/lead.
- **CRM** — leads com lead score híbrido (regras + IA), pipeline Kanban, clientes com timeline consolidada.
- **Comercial** — catálogo de serviços, propostas com numeração sequencial, fechamento de venda transacional (cliente + projeto + financeiro criados atomicamente).
- **Projetos** — etapas por serviço, progresso, tarefas.
- **Financeiro** — contas a receber/pagar, parcelamento sem perda de centavos, painel de faturamento/recebido/vencido.
- **Agenda** — eventos reais + projeção automática de vencimentos financeiros (sem duplicar).
- **Automações** — motor trigger → condition → action com log de auditoria de cada execução.
- **Nexo AI** — consultas em linguagem natural respondidas com dados reais (nunca inventa números).
- **Notas e anexos** — em leads e clientes, com upload real de arquivos.
- **Exportação CSV** — leads, propostas, vendas e contas a receber, direto de Relatórios.
- **Onboarding** — assistente de primeiro uso (empresa, WhatsApp, IA) no primeiro login.
- **Modo demonstração** — popula o sistema com dados fictícios realistas para portfólio/demo, sem tocar em dados reais.

## Architecture

Monorepo pnpm com três camadas: `packages/shared` (tipos, regras de negócio puras), `packages/database` (schema Drizzle + PostgreSQL/Neon), `apps/api` (Fastify, modular por domínio) e `apps/web` (React). Veja [docs/architecture.md](docs/architecture.md) para os diagramas completos.

## Tech Stack

**Frontend** — React, TypeScript, Vite, Tailwind CSS, Radix UI, TanStack Query, Zustand, React Hook Form, Zod, Recharts.

**Backend** — Node.js, TypeScript, Fastify, Socket.IO, Drizzle ORM, PostgreSQL (Neon serverless), Argon2, whatsapp-web.js, Ollama/Groq.

## Getting Started

```bash
# instalar dependências
pnpm install

# Windows apenas: baixa um Node 22 LTS local (não mexe na instalação do sistema) e
# recompila o better-sqlite3 para ele — necessário por causa de uma instabilidade
# nativa do Node 24 no Windows (veja Known Limitations). O apps/api/scripts/run-server.mjs
# já detecta e usa esse Node automaticamente sempre que ele existir.
pnpm setup:node22

# copiar variáveis de ambiente
cp apps/api/.env.example apps/api/.env

# gerar e aplicar migrations
pnpm db:generate
pnpm db:migrate

# popular dados de sistema + demo (opcional)
DEMO_MODE=true pnpm db:seed

# subir API e frontend
pnpm dev
```

- API: http://localhost:3333
- Frontend: http://localhost:5173
- Login de demonstração: `owner@nexodesk.local` / `nexodesk123` (definidos em `SEED_OWNER_EMAIL`/`SEED_OWNER_PASSWORD`)

Para rodar em modo produção: `pnpm build` (typecheck da API + build otimizado do frontend) seguido de `pnpm start` (sobe a API via `tsx`, servindo o bundle do frontend a partir de um servidor estático de sua escolha — ex: `npx serve apps/web/dist`).

## WhatsApp Integration

Integração via `whatsapp-web.js` (não oficial). Ao conectar em **Configurações → Integrações**, um QR Code é exibido para pareamento com o WhatsApp do celular. A sessão é persistida localmente (`WHATSAPP_SESSION_PATH`) e reconectada automaticamente com backoff exponencial limitado. Como é uma integração não oficial, evite disparos em massa — o provider já aplica um rate limit mínimo entre envios.

## Local AI

Toda a IA roda localmente via [Ollama](https://ollama.com). Configure `OLLAMA_URL` e `OLLAMA_MODEL` no `.env`. O sistema **nunca para de funcionar** se o Ollama estiver offline — toda chamada de IA passa por um wrapper que falha silenciosamente e degrada a experiência (sem sugestões/análises), sem afetar CRM, financeiro ou WhatsApp. A saída do modelo é sempre validada com Zod antes de tocar o banco — nunca é confiada diretamente.

## Database

PostgreSQL (Neon serverless) via Drizzle ORM, ~39 tabelas cobrindo todo o domínio (contatos, leads, pipeline, clientes, propostas, vendas, projetos, financeiro, agenda, automações, IA, notificações, auditoria). Dinheiro é sempre armazenado como centavos (inteiro), nunca float. Ids são ULID; documentos comerciais (propostas, vendas) têm numeração sequencial própria (`PROP-000001`, `VEN-000001`).

## Security

- Autenticação JWT, senhas com Argon2.
- RBAC preparado (`owner`, `admin`, `comercial`, `financeiro`, `atendimento`) — apenas Owner ativo no MVP.
- Validação de entrada com Zod no backend (nunca confia só no frontend).
- Rate limiting global + reforçado em login e envio de mensagens.
- Erros padronizados (`{ error: { code, message } }`), sem vazar stack trace.

## Project Structure

```
apps/
  api/      Fastify — módulos por domínio (auth, whatsapp, crm, finance, ai, automations...)
  web/      React — layout, features por domínio, design system
packages/
  shared/   tipos, enums, regras puras (telefone, dinheiro, eventos)
  database/ schema Drizzle, migrations, seed
docs/
  architecture.md
```

## Roadmap

Fases 1–10 do plano original implementadas: fundação, WhatsApp, CRM, comercial, projetos, financeiro, agenda (semana/mês/lista), IA, automações, e polimento (onboarding, notas, anexos, exportação CSV, testes automatizados). Pendências conhecidas para evolução futura: exportação em PDF, RBAC granular multiusuário com UI de administração, mais cobertura de testes.

## Known Limitations

- **Node.js 24 no Windows**: investigação detalhada (bisecção sistemática, isolando cada plugin/módulo) confirmou uma instabilidade nativa real — o processo Node trava com uma assertion (`RemoveEnvironmentCleanupHook`) quando o Chrome real lançado pelo Puppeteer via whatsapp-web.js roda sob Node 24 no Windows. Não é um bug no código da aplicação. A correção aplicada: `pnpm setup:node22` baixa um Node 22 LTS local isolado (dentro de `.tools/`) e `apps/api/scripts/run-server.mjs` o usa automaticamente sempre que presente — `pnpm dev`/`pnpm start` já funcionam direto, incluindo a conexão real do WhatsApp. Sem rodar `pnpm setup:node22`, o sistema roda no Node do sistema e pode apresentar os mesmos crashes se for Node 23+.
- A integração com WhatsApp é não oficial; contas podem ser banidas em caso de uso abusivo — não use para disparo em massa.
- Exportação em PDF ainda não implementada (CSV já disponível em Relatórios para leads, propostas, vendas e contas a receber).
- RBAC multiusuário granular (permissões por recurso) está preparado no schema mas não tem UI de administração ainda — hoje o controle é por role (`owner`, `admin`, `comercial`, `financeiro`, `atendimento`).

## Disclaimer

Este é um projeto real de operação de negócio, não um brinquedo. A integração com WhatsApp Web é não oficial e deve ser usada com responsabilidade, respeitando os termos de uso do WhatsApp.

## License

Proprietary — uso interno.
