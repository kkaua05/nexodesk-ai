export interface ConversationMessageForAI {
  direction: "inbound" | "outbound";
  body: string;
  timestamp: Date;
}

export interface IntentClassification {
  intent: string;
  service: string | null;
  urgency: "low" | "medium" | "high";
  sentiment: "negative" | "neutral" | "positive";
}

export interface ExtractedLeadData {
  segment: string | null;
  service: string | null;
  budgetCents: number | null;
  deadline: string | null;
}

export interface ConversationSummary {
  summary: string;
  nextStep: string | null;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * All AI usage in the app goes through this interface (spec §34) — no Ollama calls
 * scattered around the codebase. Every method must be safe to call even when the
 * underlying model is offline: implementations should throw a typed error, never hang.
 */
export interface AIProvider {
  readonly modelName: string;
  classifyIntent(message: string): Promise<IntentClassification>;
  extractLeadData(messages: ConversationMessageForAI[]): Promise<ExtractedLeadData>;
  summarizeConversation(messages: ConversationMessageForAI[]): Promise<ConversationSummary>;
  suggestReply(messages: ConversationMessageForAI[]): Promise<string>;
  /** Free-form conversation (Nexo AI's "general_chat" route) — no JSON contract, just a text reply. */
  chat(message: string, history: ChatMessage[]): Promise<string>;
  isAvailable(): Promise<boolean>;
}

export class AIUnavailableError extends Error {
  constructor(reason: string) {
    super(`IA indisponível: ${reason}`);
    this.name = "AIUnavailableError";
  }
}
