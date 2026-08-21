import { eq } from "drizzle-orm";
import { db } from "../../shared/database.js";
import { schema } from "@nexodesk/database";
import { env } from "../../shared/env.js";
import { OllamaProvider } from "./ollama.provider.js";
import type { AIProvider, ConversationMessageForAI } from "./ai-provider.js";

export const aiProvider: AIProvider = new OllamaProvider({
  baseUrl: env.OLLAMA_URL,
  model: env.OLLAMA_MODEL,
  timeoutMs: env.OLLAMA_TIMEOUT_MS,
});

/**
 * The app must keep working with the AI offline (spec §35) — every call site uses
 * this wrapper instead of calling the provider directly, so a timeout/error never
 * bubbles up and breaks the WhatsApp message flow or an HTTP request.
 */
export async function safeAI<T>(fn: (provider: AIProvider) => Promise<T>): Promise<T | null> {
  try {
    return await fn(aiProvider);
  } catch (error) {
    console.warn(`[ai] chamada falhou, prosseguindo sem IA: ${(error as Error).message}`);
    return null;
  }
}

function toConversationMessages(conversationId: string): ConversationMessageForAI[] {
  return db
    .select()
    .from(schema.messages)
    .where(eq(schema.messages.conversationId, conversationId))
    .orderBy(schema.messages.createdAt)
    .all()
    .filter((m) => m.body)
    .map((m) => ({ direction: m.direction, body: m.body as string, timestamp: m.createdAt }));
}

export async function analyzeConversation(conversationId: string, leadId: string | undefined, lastMessage: string) {
  const classification = await safeAI((p) => p.classifyIntent(lastMessage));
  if (!classification) return null;

  return db
    .insert(schema.aiAnalyses)
    .values({
      conversationId,
      leadId,
      intent: classification.intent,
      service: classification.service,
      urgency: classification.urgency,
      sentiment: classification.sentiment,
      model: aiProvider.modelName,
    })
    .returning()
    .get();
}

export async function extractLeadData(conversationId: string, leadId: string) {
  const messages = toConversationMessages(conversationId);
  if (messages.length === 0) return null;

  const extracted = await safeAI((p) => p.extractLeadData(messages));
  if (!extracted) return null;

  db.insert(schema.aiAnalyses)
    .values({ conversationId, leadId, extractedData: extracted, model: aiProvider.modelName })
    .run();

  if (extracted.segment) {
    db.insert(schema.aiMemories)
      .values({ leadId, content: `Segmento: ${extracted.segment}`, kind: "fato", sourceConversationId: conversationId })
      .run();
  }
  if (extracted.budgetCents) {
    db.insert(schema.aiMemories)
      .values({ leadId, content: `Orçamento informado: ${extracted.budgetCents}`, kind: "fato", sourceConversationId: conversationId })
      .run();
  }
  if (extracted.deadline) {
    db.insert(schema.aiMemories)
      .values({ leadId, content: `Prazo desejado: ${extracted.deadline}`, kind: "fato", sourceConversationId: conversationId })
      .run();
  }

  return extracted;
}

export async function summarizeConversation(conversationId: string) {
  const messages = toConversationMessages(conversationId);
  if (messages.length === 0) return null;

  const summary = await safeAI((p) => p.summarizeConversation(messages));
  if (!summary) return null;

  return db
    .insert(schema.aiSummaries)
    .values({ conversationId, summary: summary.summary, nextStep: summary.nextStep, model: aiProvider.modelName })
    .returning()
    .get();
}

export async function suggestReply(conversationId: string) {
  const messages = toConversationMessages(conversationId);
  if (messages.length === 0) return null;
  return safeAI((p) => p.suggestReply(messages));
}
