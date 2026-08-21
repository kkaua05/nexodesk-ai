# Arquitetura — NexoDesk AI

## Visão geral

```mermaid
flowchart LR
    subgraph Frontend["apps/web — React"]
        UI[Sidebar / Header / Páginas]
        Store[Zustand: auth, ui]
        Query[TanStack Query]
        SocketClient[Socket.IO client]
    end

    subgraph Backend["apps/api — Fastify"]
        Routes[Rotas REST /api/*]
        Services[Serviços de domínio]
        Realtime[Socket.IO server]
        WA[WhatsApp Provider]
        AI[AI Provider]
        Scheduler[Automation Scheduler]
    end

    DB[(SQLite / Drizzle)]
    Ollama[(Ollama local)]
    WhatsApp[(WhatsApp Web)]

    UI --> Query --> Routes
    SocketClient <--> Realtime
    Routes --> Services --> DB
    Services --> Realtime
    WA <--> WhatsApp
    WA --> Services
    AI <--> Ollama
    Services --> AI
    Scheduler --> Services
```

## Fluxo principal: mensagem do WhatsApp → lead

Este é o fluxo central do produto (spec §1), implementado em `apps/api/src/modules/whatsapp/message-handler.ts`.

```mermaid
flowchart TD
    A[WhatsApp] --> B[WhatsAppWebProvider]
    B --> C[message-handler.ts]
    C --> D[contacts.service: findOrCreateContact]
    D --> E{Contato existe?<br/>telefone normalizado}
    E -->|Não| F[Criar contato]
    E -->|Sim| G[Atualizar lastContactAt]
    F --> H[conversations.service: findOrCreateConversation]
    G --> H
    H --> I[appendMessage — idempotente por externalId]
    I --> J{Lead ativo existe?}
    J -->|Não| K[automations: lead_auto_create<br/>leads.service.createLeadForContact]
    J -->|Sim| L[applyScoreEvent: respondeu_rapido]
    K --> M[automations: lead_ai_analysis]
    L --> M
    M --> N[ai.service: analyzeConversation + extractLeadData]
    N --> O[(SQLite)]
    O --> P[Socket.IO: message.received, lead.created/updated]
    P --> Q[Frontend atualiza em tempo real]
```

## Fluxo: fechamento de venda (venda ganha)

Implementado em `apps/api/src/modules/sales/sales.service.ts` como uma única transação de banco (spec §22, §93) — se qualquer etapa falhar, nada é criado.

```mermaid
flowchart TD
    A[Usuário confirma venda no modal] --> B[POST /sales/close]
    B --> C[db.transaction]
    C --> D[Cliente já existe para este lead?]
    D -->|Não| E[Criar cliente a partir do contato]
    D -->|Sim| F[Reutilizar cliente existente]
    E --> G[Criar venda — número sequencial VEN-000001]
    F --> G
    G --> H[Criar projeto + copiar etapas do template do serviço]
    H --> I[Gerar parcelas em accounts_receivable<br/>sem perda de centavos]
    I --> J[Atualizar lead → ganho / oportunidade → fechado]
    J --> K[Registrar eventos na timeline do cliente]
    K --> L[Commit da transação]
    L --> M[Emitir sale.created, project.updated]
    M --> N[Log de auditoria — não bloqueia a resposta se falhar]
```

## Realtime

Eventos nomeados especificamente (`packages/shared/src/events.ts`) — nunca eventos genéricos `update`/`data` (spec §8). Cada módulo do backend emite via `shared/realtime.ts`; o frontend assina via o hook `useSocketEvent` e invalida as queries do TanStack Query correspondentes.

## WhatsApp provider — inicialização preguiçosa + Node 22 local

`whatsapp.service.ts` constrói o `WhatsAppWebProvider` sob demanda (na primeira chamada a `connect`/`disconnect`/`status`), em vez de como efeito colateral do import do módulo — evita uma colisão de inicialização entre addons nativos (Argon2, better-sqlite3) que ocorria no carregamento do módulo. A causa raiz mais profunda, porém, é do Node 24 no Windows em si: até addons nativos isolados (better-sqlite3 sozinho) e principalmente o lançamento real do Chrome pelo Puppeteer (`Client.initialize()`) disparam uma assertion nativa (`RemoveEnvironmentCleanupHook`) nessa combinação de SO+versão do Node.

A correção definitiva é de infraestrutura, não de código de aplicação: `apps/api/scripts/run-server.mjs` re-executa o servidor com um Node 22 LTS baixado localmente em `.tools/` (via `pnpm setup:node22`) sempre que ele estiver presente, sem exigir alterar a instalação global do Node. Validado com o fluxo completo — login, CRUD, e `Client.initialize()` do Puppeteer lançando o Chrome de verdade e retornando o QR Code — rodando de forma estável.

## IA local

`apps/api/src/modules/ai/ai-provider.ts` define a interface `AIProvider`; `OllamaProvider` é a única implementação hoje. Todo call-site passa por `safeAI()`, que nunca deixa uma falha de IA quebrar o fluxo principal (spec §35). Saídas do modelo são sempre validadas com Zod (spec §37) antes de tocar o banco.

## Banco de dados

Schema completo em `packages/database/src/schema/*.ts`, ~39 tabelas. Dinheiro sempre em centavos (inteiro). Datas em UTC (`timestamp_ms`), apresentadas no timezone configurado (`America/Sao_Paulo` por padrão). Ids são ULID; documentos comerciais têm numeração sequencial própria via contador durável em `settings` (`seq:PROP`, `seq:VEN`).

## Automações

`apps/api/src/modules/automations/automations.service.ts` — `runAutomation()` envolve toda automação com log de execução (sucesso/erro/pulado) em `automation_runs`, nunca invisível (spec §45). O scheduler (`scheduler.ts`) roda a cada 15 minutos verificando pagamentos a vencer, pagamentos vencidos e leads inativos.
