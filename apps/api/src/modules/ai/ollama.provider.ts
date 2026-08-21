import { z } from "zod";
import {
  AIUnavailableError,
  type AIProvider,
  type ConversationMessageForAI,
  type ConversationSummary,
  type ExtractedLeadData,
  type IntentClassification,
} from "./ai-provider.js";

const intentSchema = z.object({
  intent: z.string(),
  service: z.string().nullable().default(null),
  urgency: z.enum(["low", "medium", "high"]).default("medium"),
  sentiment: z.enum(["negative", "neutral", "positive"]).default("neutral"),
});

const extractionSchema = z.object({
  segment: z.string().nullable().default(null),
  service: z.string().nullable().default(null),
  budgetCents: z.number().int().nullable().default(null),
  deadline: z.string().nullable().default(null),
});

const summarySchema = z.object({
  summary: z.string(),
  nextStep: z.string().nullable().default(null),
});

function renderConversation(messages: ConversationMessageForAI[]): string {
  return messages
    .map((m) => `[${m.direction === "inbound" ? "Cliente" : "Empresa"}] ${m.body}`)
    .join("\n");
}

export class OllamaProvider implements AIProvider {
  readonly modelName: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(options: { baseUrl: string; model: string; timeoutMs?: number }) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.modelName = options.model;
    this.timeoutMs = options.timeoutMs ?? 15000;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${this.baseUrl}/api/tags`, { signal: controller.signal });
      clearTimeout(timeout);
      return res.ok;
    } catch {
      return false;
    }
  }

  private async runJsonPrompt<S extends z.ZodTypeAny>(prompt: string, schema: S): Promise<z.output<S>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: this.modelName, prompt, format: "json", stream: false }),
        signal: controller.signal,
      });
    } catch (error) {
      throw new AIUnavailableError((error as Error).message);
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new AIUnavailableError(`HTTP ${response.status}`);
    }

    const data = (await response.json()) as { response: string };

    // Never trust the model's JSON directly — always validate before it touches the DB (spec §37).
    let parsed: unknown;
    try {
      parsed = JSON.parse(data.response);
    } catch {
      throw new AIUnavailableError("resposta do modelo não é um JSON válido");
    }

    const result = schema.safeParse(parsed);
    if (!result.success) {
      throw new AIUnavailableError(`saída do modelo não passou na validação: ${result.error.message}`);
    }
    return result.data;
  }

  async classifyIntent(message: string): Promise<IntentClassification> {
    const prompt = `Classifique a mensagem de um lead de uma empresa de desenvolvimento web/software.
Responda SOMENTE com JSON no formato:
{"intent": "orcamento|duvida|suporte|reclamacao|outro", "service": "landing_page|site_institucional|ecommerce|sistema_web|crm|automacao|manutencao|null", "urgency": "low|medium|high", "sentiment": "negative|neutral|positive"}

Mensagem: "${message}"`;
    return this.runJsonPrompt(prompt, intentSchema);
  }

  async extractLeadData(messages: ConversationMessageForAI[]): Promise<ExtractedLeadData> {
    const prompt = `Extraia dados estruturados da conversa abaixo entre um lead e uma empresa de serviços digitais.
Responda SOMENTE com JSON no formato:
{"segment": string|null, "service": string|null, "budgetCents": number|null, "deadline": string|null}
budgetCents deve ser o valor em centavos (ex: R$ 2.000 = 200000).

Conversa:
${renderConversation(messages)}`;
    return this.runJsonPrompt(prompt, extractionSchema);
  }

  async summarizeConversation(messages: ConversationMessageForAI[]): Promise<ConversationSummary> {
    const prompt = `Resuma a conversa abaixo em português, de forma objetiva, e sugira o próximo passo comercial.
Responda SOMENTE com JSON no formato: {"summary": string, "nextStep": string|null}

Conversa:
${renderConversation(messages)}`;
    return this.runJsonPrompt(prompt, summarySchema);
  }

  async suggestReply(messages: ConversationMessageForAI[]): Promise<string> {
    const prompt = `Você é um atendente comercial de uma empresa de desenvolvimento web/software. Sugira UMA resposta curta e profissional em português para a última mensagem do cliente, considerando o histórico.
Responda SOMENTE com JSON no formato: {"reply": string}

Conversa:
${renderConversation(messages)}`;
    const result = await this.runJsonPrompt(prompt, z.object({ reply: z.string() }));
    return result.reply;
  }
}
