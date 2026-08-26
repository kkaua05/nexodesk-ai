import { eq } from "drizzle-orm";
import { db } from "../../shared/database.js";
import { schema } from "@nexodesk/database";
import { env } from "../../shared/env.js";
import { OllamaProvider } from "./ollama.provider.js";
import { GroqProvider } from "./groq.provider.js";
import type { AIProvider, ConversationMessageForAI } from "./ai-provider.js";

export const aiProviderName = env.AI_PROVIDER;

export const aiProvider: AIProvider =
  env.AI_PROVIDER === "groq"
    ? new GroqProvider({
        apiKey: env.GROQ_API_KEY,
        model: env.GROQ_MODEL,
        timeoutMs: env.GROQ_TIMEOUT_MS,
      })
    : new OllamaProvider({
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

async function toConversationMessages(conversationId: string): Promise<ConversationMessageForAI[]> {
  return (await (db
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.conversationId, conversationId))
      .orderBy(schema.messages.createdAt)))
    .filter((m) => m.body)
    .map((m) => ({ direction: m.direction, body: m.body as string, timestamp: m.createdAt }));
}

export async function analyzeConversation(conversationId: string, leadId: string | undefined, lastMessage: string) {
  const classification = await safeAI((p) => p.classifyIntent(lastMessage));
  if (!classification) return null;

  return (await (db
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
      .returning()))[0];
}

export async function extractLeadData(conversationId: string, leadId: string) {
  const messages = await toConversationMessages(conversationId);
  if (messages.length === 0) return null;

  const extracted = await safeAI((p) => p.extractLeadData(messages));
  if (!extracted) return null;

  (await (db.insert(schema.aiAnalyses)
        .values({ conversationId, leadId, extractedData: extracted, model: aiProvider.modelName })));

  if (extracted.segment) {
    (await (db.insert(schema.aiMemories)
            .values({ leadId, content: `Segmento: ${extracted.segment}`, kind: "fato", sourceConversationId: conversationId })));
  }
  if (extracted.budgetCents) {
    (await (db.insert(schema.aiMemories)
            .values({ leadId, content: `Orçamento informado: ${extracted.budgetCents}`, kind: "fato", sourceConversationId: conversationId })));
  }
  if (extracted.deadline) {
    (await (db.insert(schema.aiMemories)
            .values({ leadId, content: `Prazo desejado: ${extracted.deadline}`, kind: "fato", sourceConversationId: conversationId })));
  }

  return extracted;
}

export async function summarizeConversation(conversationId: string) {
  const messages = await toConversationMessages(conversationId);
  if (messages.length === 0) return null;

  const summary = await safeAI((p) => p.summarizeConversation(messages));
  if (!summary) return null;

  return (await (db
      .insert(schema.aiSummaries)
      .values({ conversationId, summary: summary.summary, nextStep: summary.nextStep, model: aiProvider.modelName })
      .returning()))[0];
}

export async function suggestReply(conversationId: string) {
  const messages = await toConversationMessages(conversationId);
  if (messages.length === 0) return null;
  return safeAI((p) => p.suggestReply(messages));
}
