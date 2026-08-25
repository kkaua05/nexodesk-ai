import { z } from "zod";
import "dotenv/config";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3333),
  HOST: z.string().default("0.0.0.0"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  DATABASE_URL: z.string().default("file:./data/database.sqlite"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET deve ter pelo menos 16 caracteres"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  AI_PROVIDER: z.enum(["ollama", "groq"]).default("ollama"),
  OLLAMA_URL: z.string().default("http://localhost:11434"),
  OLLAMA_MODEL: z.string().default("qwen2.5"),
  OLLAMA_TIMEOUT_MS: z.coerce.number().default(15000),
  GROQ_API_KEY: z.string().default(""),
  GROQ_MODEL: z.string().default("llama-3.3-70b-versatile"),
  GROQ_TIMEOUT_MS: z.coerce.number().default(15000),
  WHATSAPP_SESSION_PATH: z.string().default("./sessions"),
  DEMO_MODE: z.coerce.boolean().default(false),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("[env] configuração inválida:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
