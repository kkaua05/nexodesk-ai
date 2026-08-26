import argon2 from "argon2";
import { createDatabase } from "./client";
import {
  users,
  pipelineStages,
  services,
  serviceStageTemplates,
  financialCategories,
  automations,
  settings,
  contacts,
  conversations,
  messages,
  leads,
  leadEvents,
  customers,
  timelineEvents,
  opportunities,
  proposals,
  proposalItems,
  sales,
  projects,
  projectStages,
  tasks,
  accountsReceivable,
  payments,
  calendarEvents,
  followUps,
} from "./schema/index";
import { PIPELINE_STAGE, createId, toCents, splitInstallments } from "@nexodesk/shared";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL não definida");
}
const demoMode = process.env.DEMO_MODE === "true";
const { db, pool } = createDatabase(databaseUrl);

const PIPELINE_LABELS: Record<(typeof PIPELINE_STAGE)[number], string> = {
  novo_lead: "Novo Lead",
  contato: "Contato",
  qualificacao: "Qualificação",
  orcamento: "Orçamento",
  proposta: "Proposta",
  negociacao: "Negociação",
  fechado: "Fechado",
  perdido: "Perdido",
};

async function seedSystemData() {
  // --- pipeline stages ---
  for (const [index, key] of PIPELINE_STAGE.entries()) {
    const existing = (await (db.select().from(pipelineStages))).find((s) => s.key === key);
    if (!existing) {
      (await (db.insert(pipelineStages).values({ key, label: PIPELINE_LABELS[key], order: index })));
    }
  }

  // --- owner user ---
  const ownerEmail = process.env.SEED_OWNER_EMAIL ?? "owner@nexodesk.local";
  const existingOwner = (await (db.select().from(users))).find((u) => u.email === ownerEmail);
  if (!existingOwner) {
    const passwordHash = await argon2.hash(process.env.SEED_OWNER_PASSWORD ?? "nexodesk123");
    (await (db.insert(users)
            .values({ name: "Owner", email: ownerEmail, passwordHash, role: "owner" })));
    console.log(`[seed] usuário owner criado: ${ownerEmail}`);
  }

  // --- service catalog ---
  const catalog = [
    { name: "Landing Page", category: "Web", base: 1500, min: 900, days: 10, down: 750, stages: ["Briefing", "Conteúdo recebido", "Design", "Desenvolvimento", "Responsividade", "Revisão", "Aprovação", "Publicação", "Concluído"] },
    { name: "Site Institucional", category: "Web", base: 2500, min: 1500, days: 15, down: 1250, stages: ["Briefing", "Conteúdo recebido", "Design", "Desenvolvimento", "Revisão", "Publicação", "Concluído"] },
    { name: "E-commerce", category: "Web", base: 6000, min: 4000, days: 30, down: 3000, stages: ["Briefing", "Catálogo", "Design", "Desenvolvimento", "Integração de pagamento", "Testes", "Publicação", "Concluído"] },
    { name: "Sistema Web", category: "Software", base: 8000, min: 5000, days: 45, down: 4000, stages: ["Briefing", "Modelagem", "Design", "Desenvolvimento", "Testes", "Homologação", "Publicação", "Concluído"] },
    { name: "CRM", category: "Software", base: 7000, min: 4500, days: 40, down: 3500, stages: ["Briefing", "Modelagem", "Desenvolvimento", "Testes", "Treinamento", "Concluído"] },
    { name: "Automação", category: "Automação", base: 1200, min: 600, days: 7, down: 600, stages: ["Briefing", "Desenvolvimento", "Testes", "Concluído"] },
    { name: "Manutenção", category: "Suporte", base: 300, min: 150, days: 3, down: null, stages: ["Solicitação", "Execução", "Concluído"] },
    { name: "Suporte Técnico", category: "Suporte", base: 200, min: 100, days: 1, down: null, stages: ["Solicitação", "Atendimento", "Concluído"] },
    { name: "Hospedagem", category: "Infraestrutura", base: 60, min: 40, days: 1, down: null, stages: ["Configuração", "Ativo"] },
  ];

  for (const item of catalog) {
    const existing = (await (db.select().from(services))).find((s) => s.name === item.name);
    if (existing) continue;
    const id = createId();
    (await (db.insert(services)
            .values({
              id,
              name: item.name,
              category: item.category,
              basePriceCents: toCents(item.base),
              minPriceCents: toCents(item.min),
              averageDeliveryDays: item.days,
              suggestedDownPaymentCents: item.down ? toCents(item.down) : null,
            })));
    for (const [order, name] of item.stages.entries()) {
      await db.insert(serviceStageTemplates).values({ serviceId: id, name, order });
    }
  }

  // --- financial categories ---
  const categories: { name: string; type: "receita" | "despesa" }[] = [
    { name: "Venda de serviço", type: "receita" },
    { name: "Domínio", type: "despesa" },
    { name: "Hospedagem", type: "despesa" },
    { name: "Servidor", type: "despesa" },
    { name: "Software", type: "despesa" },
    { name: "Publicidade", type: "despesa" },
    { name: "Equipamentos", type: "despesa" },
    { name: "Serviços contratados", type: "despesa" },
    { name: "Impostos", type: "despesa" },
    { name: "Outros", type: "despesa" },
  ];
  for (const c of categories) {
    const existing = (await (db.select().from(financialCategories))).find((f) => f.name === c.name);
    if (!existing) (await (db.insert(financialCategories).values(c)));
  }

  // --- automation registry ---
  const automationDefs = [
    { key: "lead_auto_create", name: "Cadastro automático de leads", description: "Cria contato/lead ao receber mensagem de número desconhecido" },
    { key: "lead_ai_analysis", name: "Análise automática por IA", description: "Classifica intenção e extrai dados da primeira mensagem de um lead" },
    {
      key: "whatsapp_ai_auto_reply",
      name: "Nexo AI responde automaticamente",
      description: "A IA responde sozinha às mensagens do WhatsApp até um atendente assumir a conversa manualmente",
    },
    { key: "sale_conversion", name: "Conversão de venda", description: "Converte lead em cliente e cria projeto + financeiro ao ganhar uma venda" },
    { key: "payment_due_soon", name: "Aviso de vencimento", description: "Alerta quando um pagamento vence em 1 dia" },
    { key: "payment_overdue", name: "Pagamento vencido", description: "Marca conta como atrasada e cria alerta" },
    { key: "lead_inactivity_followup", name: "Follow-up por inatividade", description: "Cria follow-up quando um lead fica X dias sem interação" },
  ];
  for (const a of automationDefs) {
    const existing = (await (db.select().from(automations))).find((x) => x.key === a.key);
    if (!existing) (await (db.insert(automations).values(a)));
  }

  // --- default settings ---
  const defaultSettings: Record<string, unknown> = {
    company: { name: "Minha Empresa", currency: "BRL", timezone: "America/Sao_Paulo" },
    ai: { provider: "ollama", url: process.env.OLLAMA_URL ?? "http://localhost:11434", model: process.env.OLLAMA_MODEL ?? "qwen2.5" },
    automations: {
      lead_auto_create: true,
      lead_ai_analysis: true,
      whatsapp_ai_auto_reply: true,
      sale_conversion: true,
      payment_due_soon: true,
      payment_overdue: true,
      lead_inactivity_followup: true,
    },
  };
  for (const [key, value] of Object.entries(defaultSettings)) {
    const existing = (await (db.select().from(settings))).find((s) => s.key === key);
    if (!existing) (await (db.insert(settings).values({ key, value })));
  }
}

async function seedDemoData() {
  const alreadySeeded = (await (db.select().from(contacts))).length > 0;
  if (alreadySeeded) {
    console.log("[seed] dados de demonstração já existem, pulando");
    return;
  }

  const now = Date.now();
  const days = (n: number) => now - n * 24 * 60 * 60 * 1000;

  const demoPeople = [
    { name: "João Silva", phone: "+5551999990001", service: "Landing Page", segment: "loja de roupas", firstMsg: "Oi, quanto custa uma landing page?", score: 87, daysAgo: 2 },
    { name: "Maria Oliveira", phone: "+5551999990002", service: "E-commerce", segment: "artesanato", firstMsg: "Preciso de uma loja virtual, vocês fazem?", score: 64, daysAgo: 5 },
    { name: "Empresa X Ltda", phone: "+5551999990003", service: "Sistema Web", segment: "logística", firstMsg: "Vi o trabalho de vocês, gostaria de um orçamento para um sistema interno.", score: 45, daysAgo: 9 },
    { name: "Carlos Souza", phone: "+5551999990004", service: "Manutenção", segment: "consultoria", firstMsg: "Meu site caiu, conseguem verificar?", score: 30, daysAgo: 1 },
  ];

  const services_ = (await (db.select().from(services)));

  for (const person of demoPeople) {
    const service = services_.find((s) => s.name === person.service);
    const contactId = createId();
    (await (db.insert(contacts)
            .values({
              id: contactId,
              name: person.name,
              phoneRaw: person.phone,
              phoneNormalized: person.phone,
              callingCode: "55",
              countryCode: "BR",
              firstContactAt: new Date(days(person.daysAgo)),
              lastContactAt: new Date(days(0)),
            })));

    const conversationId = createId();
    (await (db.insert(conversations)
            .values({
              id: conversationId,
              contactId,
              externalId: `${person.phone}@c.us`,
              status: "aguardando_resposta",
              lastMessagePreview: person.firstMsg,
              lastMessageAt: new Date(days(0)),
            })));

    (await (db.insert(messages)
            .values({
              conversationId,
              externalId: createId(),
              direction: "inbound",
              type: "texto",
              body: person.firstMsg,
              status: "lido",
              createdAt: new Date(days(person.daysAgo)),
            })));

    const leadId = createId();
    (await (db.insert(leads)
            .values({
              id: leadId,
              contactId,
              serviceId: service?.id,
              status: "qualificacao",
              origin: "whatsapp",
              score: person.score,
              potentialValueCents: service?.basePriceCents,
              firstMessage: person.firstMsg,
              createdAt: new Date(days(person.daysAgo)),
            })));

    (await (db.insert(leadEvents)
            .values({ leadId, type: "solicitou_orcamento", scoreDelta: 20, description: "Solicitou orçamento no primeiro contato" })));

    (await (db.insert(opportunities)
            .values({ leadId, stageKey: "qualificacao", valueCents: service?.basePriceCents })));
  }

  // João Silva converts into a full customer + project + financeiro, to populate the timeline demo.
  const joao = (await (db.select().from(contacts))).find((c) => c.name === "João Silva")!;
  const joaoLead = (await (db.select().from(leads))).find((l) => l.contactId === joao.id)!;
  const landingPage = services_.find((s) => s.name === "Landing Page")!;

  const customerId = createId();
  (await (db.insert(customers)
        .values({
          id: customerId,
          contactId: joao.id,
          originLeadId: joaoLead.id,
          name: joao.name ?? joao.phoneNormalized,
          customerSince: new Date(days(0)),
        })));

  const proposalNumber = "PROP-000001";
  const proposalId = createId();
  const proposalTotal = toCents(1500);
  (await (db.insert(proposals)
        .values({
          id: proposalId,
          number: proposalNumber,
          leadId: joaoLead.id,
          customerId,
          serviceId: landingPage.id,
          subtotalCents: proposalTotal,
          totalCents: proposalTotal,
          downPaymentCents: toCents(750),
          installmentCount: 2,
          deliveryDays: 15,
          status: "aceita",
          sentAt: new Date(days(1)),
          respondedAt: new Date(days(0)),
        })));
  (await (db.insert(proposalItems)
        .values({ proposalId, description: "Landing Page — desenvolvimento completo", quantity: 1, unitPriceCents: proposalTotal, totalCents: proposalTotal })));

  const saleNumber = "VEN-000001";
  const saleId = createId();
  (await (db.insert(sales)
        .values({
          id: saleId,
          number: saleNumber,
          customerId,
          leadId: joaoLead.id,
          serviceId: landingPage.id,
          proposalId,
          totalCents: proposalTotal,
          downPaymentCents: toCents(750),
          paymentMethod: "PIX",
          deliveryDays: 15,
        })));

  const projectId = createId();
  (await (db.insert(projects)
        .values({
          id: projectId,
          customerId,
          serviceId: landingPage.id,
          saleId,
          name: "Landing Page — João Silva",
          status: "desenvolvimento",
          progress: 40,
          valueCents: proposalTotal,
          startDate: new Date(days(0)),
          dueDate: new Date(now + 15 * 24 * 60 * 60 * 1000),
        })));

  const stageTemplates = (await db.select().from(serviceStageTemplates)).filter((s) => s.serviceId === landingPage.id);
  for (const [i, tpl] of stageTemplates.entries()) {
    await db.insert(projectStages).values({ projectId, name: tpl.name, order: tpl.order, completedAt: i < 3 ? new Date(days(0)) : null });
  }

  (await (db.insert(tasks)
        .values({ title: "Solicitar identidade visual", projectId, customerId, priority: "alta", status: "pendente", dueDate: new Date(now + 2 * 24 * 60 * 60 * 1000) })));

  const installments = splitInstallments(proposalTotal - toCents(750), 1);
  (await (db.insert(accountsReceivable)
        .values({
          customerId,
          saleId,
          projectId,
          description: `Entrada — ${saleNumber}`,
          installmentNumber: 1,
          installmentTotal: 2,
          amountCents: toCents(750),
          paidAmountCents: toCents(750),
          dueDate: new Date(days(0)),
          paidAt: new Date(days(0)),
          paymentMethod: "PIX",
          status: "pago",
        })));
  (await (db.insert(accountsReceivable)
        .values({
          customerId,
          saleId,
          projectId,
          description: `Saldo final — ${saleNumber}`,
          installmentNumber: 2,
          installmentTotal: 2,
          amountCents: installments[0] ?? proposalTotal - toCents(750),
          dueDate: new Date(now + 9 * 24 * 60 * 60 * 1000),
          status: "pendente",
        })));

  (await (db.insert(timelineEvents).values([
        { customerId, leadId: joaoLead.id, type: "whatsapp_contact", title: "Primeiro contato pelo WhatsApp", occurredAt: new Date(days(2)) },
        { customerId, leadId: joaoLead.id, type: "lead_classified", title: "Lead classificado como Landing Page", occurredAt: new Date(days(2)) },
        { customerId, type: "proposal_created", title: `Proposta ${proposalNumber} criada`, valueCents: proposalTotal, occurredAt: new Date(days(1)) },
        { customerId, type: "sale_won", title: "Venda fechada", occurredAt: new Date(days(0)) },
        { customerId, type: "payment_received", title: "Entrada registrada", valueCents: toCents(750), occurredAt: new Date(days(0)) },
        { customerId, type: "project_created", title: "Projeto criado", occurredAt: new Date(days(0)) },
      ])));

  (await (db.insert(calendarEvents)
        .values([
          { title: `Reunião — ${joao.name}`, type: "reuniao", customerId, startAt: new Date(now + 3 * 60 * 60 * 1000) },
          { title: "Entrega — Landing Page Maria", type: "entrega", startAt: new Date(now + 5 * 24 * 60 * 60 * 1000) },
        ])));

  const cold = (await (db.select().from(leads))).find((l) => l.score < 50)!;
  (await (db.insert(followUps)
        .values({ reason: "orcamento_parado", leadId: cold.id, note: "Sem resposta há alguns dias", dueAt: new Date(now + 1 * 24 * 60 * 60 * 1000) })));

  console.log("[seed] dados de demonstração criados");
}

async function main() {
  await seedSystemData();
  if (demoMode) {
    await seedDemoData();
  }
  await pool.end();
  console.log("[seed] concluído");
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
