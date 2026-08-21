export const LEAD_STATUS = [
  "novo",
  "contato",
  "qualificacao",
  "orcamento",
  "proposta",
  "negociacao",
  "ganho",
  "perdido",
] as const;
export type LeadStatus = (typeof LEAD_STATUS)[number];

export const PIPELINE_STAGE = [
  "novo_lead",
  "contato",
  "qualificacao",
  "orcamento",
  "proposta",
  "negociacao",
  "fechado",
  "perdido",
] as const;
export type PipelineStage = (typeof PIPELINE_STAGE)[number];

export const LEAD_TEMPERATURE = ["frio", "morno", "quente", "muito_quente"] as const;
export type LeadTemperature = (typeof LEAD_TEMPERATURE)[number];

export function temperatureFromScore(score: number): LeadTemperature {
  if (score <= 30) return "frio";
  if (score <= 60) return "morno";
  if (score <= 80) return "quente";
  return "muito_quente";
}

export const PROJECT_STATUS = [
  "planejamento",
  "aguardando_cliente",
  "design",
  "desenvolvimento",
  "revisao",
  "publicacao",
  "concluido",
  "pausado",
  "cancelado",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUS)[number];

export const TASK_STATUS = ["pendente", "em_andamento", "concluida", "cancelada"] as const;
export type TaskStatus = (typeof TASK_STATUS)[number];

export const TASK_PRIORITY = ["baixa", "normal", "alta", "urgente"] as const;
export type TaskPriority = (typeof TASK_PRIORITY)[number];

export const PROPOSAL_STATUS = [
  "rascunho",
  "enviada",
  "visualizada",
  "aceita",
  "rejeitada",
  "expirada",
] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUS)[number];

export const RECEIVABLE_STATUS = ["pendente", "pago", "vencido", "cancelado", "parcial"] as const;
export type ReceivableStatus = (typeof RECEIVABLE_STATUS)[number];

export const PAYABLE_STATUS = ["pendente", "pago", "vencido", "cancelado"] as const;
export type PayableStatus = (typeof PAYABLE_STATUS)[number];

export const CONVERSATION_STATUS = [
  "aguardando_resposta",
  "em_atendimento",
  "follow_up",
  "arquivada",
] as const;
export type ConversationStatus = (typeof CONVERSATION_STATUS)[number];

export const WHATSAPP_CONNECTION_STATUS = [
  "conectado",
  "conectando",
  "qr_necessario",
  "desconectado",
  "reconectando",
  "erro",
] as const;
export type WhatsappConnectionStatus = (typeof WHATSAPP_CONNECTION_STATUS)[number];

export const USER_ROLE = ["owner", "admin", "comercial", "financeiro", "atendimento"] as const;
export type UserRole = (typeof USER_ROLE)[number];

export const MESSAGE_DIRECTION = ["inbound", "outbound"] as const;
export type MessageDirection = (typeof MESSAGE_DIRECTION)[number];

export const MESSAGE_STATUS = ["enviando", "enviado", "entregue", "lido", "falhou"] as const;
export type MessageStatus = (typeof MESSAGE_STATUS)[number];

export const MESSAGE_TYPE = ["texto", "imagem", "audio", "video", "documento", "sticker", "localizacao"] as const;
export type MessageType = (typeof MESSAGE_TYPE)[number];

export const LEAD_ORIGIN = ["whatsapp", "manual", "indicacao", "site", "outro"] as const;
export type LeadOrigin = (typeof LEAD_ORIGIN)[number];
