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
- **Modo demonstração** — popula o sistema com dados fictícios realistas para portfólio/demo, sem tocar em dados reais.

## Architecture

Monorepo pnpm com três camadas: `packages/shared` (tipos, regras de negócio puras), `packages/database` (schema Drizzle + SQLite), `apps/api` (Fastify, modular por domínio) e `apps/web` (React). Veja [docs/architecture.md](docs/architecture.md) para os diagramas completos.

## Tech Stack

**Frontend** — React, TypeScript, Vite, Tailwind CSS, Radix UI, TanStack Query, Zustand, React Hook Form, Zod, Recharts.

**Backend** — Node.js, TypeScript, Fastify, Socket.IO, Drizzle ORM, SQLite (better-sqlite3), Argon2, whatsapp-web.js, Ollama.

## Getting Started

Pré-requisito: **Node.js 20 ou 22 (LTS)** — veja [Known Limitations](#known-limitations) sobre Node 24.

```bash
# instalar dependências
pnpm install

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

## WhatsApp Integration

Integração via `whatsapp-web.js` (não oficial). Ao conectar em **Configurações → Integrações**, um QR Code é exibido para pareamento com o WhatsApp do celular. A sessão é persistida localmente (`WHATSAPP_SESSION_PATH`) e reconectada automaticamente com backoff exponencial limitado. Como é uma integração não oficial, evite disparos em massa — o provider já aplica um rate limit mínimo entre envios.

## Local AI

Toda a IA roda localmente via [Ollama](https://ollama.com). Configure `OLLAMA_URL` e `OLLAMA_MODEL` no `.env`. O sistema **nunca para de funcionar** se o Ollama estiver offline — toda chamada de IA passa por um wrapper que falha silenciosamente e degrada a experiência (sem sugestões/análises), sem afetar CRM, financeiro ou WhatsApp. A saída do modelo é sempre validada com Zod antes de tocar o banco — nunca é confiada diretamente.

## Database

SQLite local via Drizzle ORM, ~39 tabelas cobrindo todo o domínio (contatos, leads, pipeline, clientes, propostas, vendas, projetos, financeiro, agenda, automações, IA, notificações, auditoria). Dinheiro é sempre armazenado como centavos (inteiro), nunca float. Ids são ULID; documentos comerciais (propostas, vendas) têm numeração sequencial própria (`PROP-000001`, `VEN-000001`). A arquitetura comporta migração futura para PostgreSQL sem reescrita do domínio.

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

Fases 1–9 do plano original (fundação, WhatsApp, CRM, comercial, projetos, financeiro, agenda, IA, automações) implementadas. Pendências conhecidas para evolução: exportação de PDF/CSV, calendário em visão de mês completa, upload de anexos na UI, RBAC granular multiusuário, testes de cobertura mais ampla.

## Known Limitations

- **Node.js 24**: neste ambiente de desenvolvimento (Windows), a combinação Node 24 + `better-sqlite3` apresentou crashes nativos intermitentes (`RemoveEnvironmentCleanupHook` assertion) não relacionados ao código da aplicação — é uma instabilidade do addon nativo com uma versão de Node muito recente. **Use Node 20 ou 22 (LTS)** — veja `.nvmrc`. O código foi validado extensivamente (testes automatizados + dezenas de requisições manuais) e funciona corretamente.
- A integração com WhatsApp é não oficial; contas podem ser banidas em caso de uso abusivo — não use para disparo em massa.
- Modo de calendário atual é semanal (lista por dia); visão de mês completa fica para uma iteração futura.

## Disclaimer

Este é um projeto real de operação de negócio, não um brinquedo. A integração com WhatsApp Web é não oficial e deve ser usada com responsabilidade, respeitando os termos de uso do WhatsApp.

## License

Proprietary — uso interno.
