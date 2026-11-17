export const PROVIDER_NAMES = ["openai", "anthropic", "gemini", "groq", "ollama"] as const;

export type ProviderName = (typeof PROVIDER_NAMES)[number];

export const DEFAULT_MODELS: Record<ProviderName, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-sonnet-4-5",
  gemini: "gemini-2.5-flash",
  groq: "meta-llama/llama-4-scout-17b-16e-instruct",
  ollama: "llama3.2",
};

export interface LLMConfig {
  provider: ProviderName;
  model: string;
  timeoutMs: number;
  maxRetries: number;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  googleApiKey?: string;
  groqApiKey?: string;
  ollamaBaseUrl: string;
}

export function isProviderName(value: string): value is ProviderName {
  return (PROVIDER_NAMES as readonly string[]).includes(value);
}

export function readLLMConfig(env: NodeJS.ProcessEnv): LLMConfig {
  const rawProvider = (env.LLM_PROVIDER ?? "ollama").trim().toLowerCase();
  if (!isProviderName(rawProvider)) {
    throw new Error(
      `Unknown LLM_PROVIDER "${env.LLM_PROVIDER}". Expected one of: ${PROVIDER_NAMES.join(", ")}.`,
    );
  }

  const model = (env.LLM_MODEL ?? DEFAULT_MODELS[rawProvider]).trim();
  if (!model) {
    throw new Error("LLM_MODEL must not be empty.");
  }

  return {
    provider: rawProvider,
    model,
    timeoutMs: readNumber(env.LLM_TIMEOUT_MS, 30_000, "LLM_TIMEOUT_MS", { min: 1 }),
    maxRetries: readNumber(env.LLM_MAX_RETRIES, 2, "LLM_MAX_RETRIES", { min: 0, integer: true }),
    openaiApiKey: blankToUndefined(env.OPENAI_API_KEY),
    anthropicApiKey: blankToUndefined(env.ANTHROPIC_API_KEY),
    googleApiKey: blankToUndefined(env.GOOGLE_API_KEY),
    groqApiKey: blankToUndefined(env.GROQ_API_KEY),
    ollamaBaseUrl: (env.OLLAMA_BASE_URL ?? "http://localhost:11434").trim().replace(/\/+$/, ""),
  };
}

export function requireApiKey(value: string | undefined, envName: string): string {
  if (!value) {
    throw new Error(`Missing ${envName}. Set it in the environment, or choose another LLM_PROVIDER.`);
  }
  return value;
}

function blankToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function readNumber(
  value: string | undefined,
  fallback: number,
  name: string,
  rules: { min: number; integer?: boolean },
): number {
  if (value === undefined || value.trim() === "") {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || (rules.integer && !Number.isInteger(parsed)) || parsed < rules.min) {
    const kind = rules.integer ? "an integer" : "a number";
    throw new Error(`${name} must be ${kind} greater than or equal to ${rules.min}.`);
  }
  return parsed;
}
