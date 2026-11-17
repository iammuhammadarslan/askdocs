import { requireApiKey, type LLMConfig, type ProviderName } from "./config";
import type { LLMLogger } from "./logger";
import type { LLMProvider } from "./llm-provider";
import { AnthropicProvider } from "./providers/anthropic.provider";
import { GeminiProvider } from "./providers/gemini.provider";
import { GroqProvider } from "./providers/groq.provider";
import { OllamaProvider } from "./providers/ollama.provider";
import { OpenAIProvider } from "./providers/openai.provider";
import { type RetryPolicy, ResilientLLMProvider } from "./wrapper";
import { delay } from "./timeout";

export type AdapterFactory = (config: LLMConfig) => LLMProvider;

export interface CreateLLMOptions {
  logger?: LLMLogger;
  sleep?: (ms: number) => Promise<void>;
  adapters?: Partial<Record<ProviderName, AdapterFactory>>;
}

export function defaultAdapters(): Record<ProviderName, AdapterFactory> {
  return {
    openai: (config) =>
      new OpenAIProvider({
        apiKey: requireApiKey(config.openaiApiKey, "OPENAI_API_KEY"),
        model: config.model,
      }),
    anthropic: (config) =>
      new AnthropicProvider({
        apiKey: requireApiKey(config.anthropicApiKey, "ANTHROPIC_API_KEY"),
        model: config.model,
      }),
    gemini: (config) =>
      new GeminiProvider({
        apiKey: requireApiKey(config.googleApiKey, "GOOGLE_API_KEY"),
        model: config.model,
      }),
    groq: (config) =>
      new GroqProvider({
        apiKey: requireApiKey(config.groqApiKey, "GROQ_API_KEY"),
        model: config.model,
      }),
    ollama: (config) =>
      new OllamaProvider({
        baseUrl: config.ollamaBaseUrl,
        model: config.model,
      }),
  };
}

export function createAdapter(
  config: LLMConfig,
  adapters: Record<ProviderName, AdapterFactory> = defaultAdapters(),
): LLMProvider {
  const factory = adapters[config.provider];
  return factory(config);
}

export function createLLMProvider(config: LLMConfig, options: CreateLLMOptions = {}): LLMProvider {
  const adapters = { ...defaultAdapters(), ...options.adapters };
  const policy: RetryPolicy = {
    maxRetries: config.maxRetries,
    timeoutMs: config.timeoutMs,
  };
  return new ResilientLLMProvider(createAdapter(config, adapters), policy, options.logger, options.sleep ?? delay);
}
