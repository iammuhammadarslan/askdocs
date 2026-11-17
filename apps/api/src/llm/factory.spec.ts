import type { ChatMessage, Reply } from "@askdocs/shared";
import { readLLMConfig, type LLMConfig, type ProviderName } from "./config";
import { createAdapter, createLLMProvider, type AdapterFactory } from "./factory";
import type { LLMProvider } from "./llm-provider";
import { AnthropicProvider } from "./providers/anthropic.provider";
import { GeminiProvider } from "./providers/gemini.provider";
import { GroqProvider } from "./providers/groq.provider";
import { OllamaProvider } from "./providers/ollama.provider";
import { OpenAIProvider } from "./providers/openai.provider";
import { ResilientLLMProvider } from "./wrapper";

const providers: ProviderName[] = ["openai", "anthropic", "gemini", "groq", "ollama"];

function configFor(provider: ProviderName, overrides: Partial<LLMConfig> = {}): LLMConfig {
  return {
    provider,
    model: "test-model",
    timeoutMs: 1_000,
    maxRetries: 1,
    openaiApiKey: "test-openai",
    anthropicApiKey: "test-anthropic",
    googleApiKey: "test-google",
    groqApiKey: "test-groq",
    ollamaBaseUrl: "http://127.0.0.1:11434",
    ...overrides,
  };
}

function sampleReply(provider: string): Reply {
  return {
    text: "ok",
    usage: { promptTokens: 3, completionTokens: 2, totalTokens: 5 },
    provider,
    model: "test-model",
  };
}

function mockAdapter(name: string, calls: string[]): LLMProvider {
  return {
    name,
    chat: () => {
      calls.push(name);
      return Promise.resolve(sampleReply(name));
    },
  };
}

describe("readLLMConfig", () => {
  it("defaults to local Ollama when the provider is unset", () => {
    const config = readLLMConfig({});
    expect(config.provider).toBe("ollama");
    expect(config.model).toBe("llama3.2");
    expect(config.timeoutMs).toBe(30_000);
    expect(config.maxRetries).toBe(2);
    expect(config.ollamaBaseUrl).toBe("http://localhost:11434");
  });

  it("accepts a provider name in any case and trims the base URL", () => {
    const config = readLLMConfig({
      LLM_PROVIDER: " OpenAI ",
      LLM_MODEL: "gpt-4o-mini",
      OLLAMA_BASE_URL: "http://localhost:11434/",
    });
    expect(config.provider).toBe("openai");
    expect(config.model).toBe("gpt-4o-mini");
    expect(config.ollamaBaseUrl).toBe("http://localhost:11434");
  });

  it("rejects an unknown provider and a bad timeout", () => {
    expect(() => readLLMConfig({ LLM_PROVIDER: "azure" })).toThrow(/LLM_PROVIDER/);
    expect(() => readLLMConfig({ LLM_TIMEOUT_MS: "0" })).toThrow(/LLM_TIMEOUT_MS/);
    expect(() => readLLMConfig({ LLM_MAX_RETRIES: "1.5" })).toThrow(/LLM_MAX_RETRIES/);
  });
});

describe("createLLMProvider", () => {
  it.each(providers)("selects the %s adapter from config and wraps it", async (provider) => {
    const calls: string[] = [];
    const adapters: Record<ProviderName, AdapterFactory> = {
      openai: () => mockAdapter("openai", calls),
      anthropic: () => mockAdapter("anthropic", calls),
      gemini: () => mockAdapter("gemini", calls),
      groq: () => mockAdapter("groq", calls),
      ollama: () => mockAdapter("ollama", calls),
    };

    const llm = createLLMProvider(configFor(provider), {
      adapters,
      sleep: () => Promise.resolve(),
    });

    expect(llm).toBeInstanceOf(ResilientLLMProvider);
    expect(llm.name).toBe(provider);
    const reply = await llm.chat([{ role: "user", content: "hello" }]);
    expect(calls).toEqual([provider]);
    expect(reply.provider).toBe(provider);
    expect(reply.usage.totalTokens).toBe(5);
  });

  it("builds the real adapter class for each provider without calling the network", () => {
    expect(createAdapter(configFor("openai"))).toBeInstanceOf(OpenAIProvider);
    expect(createAdapter(configFor("anthropic"))).toBeInstanceOf(AnthropicProvider);
    expect(createAdapter(configFor("gemini"))).toBeInstanceOf(GeminiProvider);
    expect(createAdapter(configFor("groq"))).toBeInstanceOf(GroqProvider);
    expect(createAdapter(configFor("ollama"))).toBeInstanceOf(OllamaProvider);
  });

  it("refuses a cloud provider that has no API key", () => {
    expect(() => createAdapter(configFor("openai", { openaiApiKey: undefined }))).toThrow(/OPENAI_API_KEY/);
    expect(() => createAdapter(configFor("anthropic", { anthropicApiKey: "" }))).toThrow(
      /ANTHROPIC_API_KEY/,
    );
    expect(() => createAdapter(configFor("gemini", { googleApiKey: undefined }))).toThrow(/GOOGLE_API_KEY/);
    expect(() => createAdapter(configFor("groq", { groqApiKey: undefined }))).toThrow(/GROQ_API_KEY/);
    expect(createAdapter(configFor("ollama", { openaiApiKey: undefined })).name).toBe("ollama");
  });
});

describe("chat messages stay typed at the boundary", () => {
  it("passes the caller's messages through the selected adapter", async () => {
    const seen: ChatMessage[][] = [];
    const llm = createLLMProvider(configFor("groq"), {
      sleep: () => Promise.resolve(),
      adapters: {
        groq: () => ({
          name: "groq",
          chat: (messages) => {
            seen.push(messages);
            return Promise.resolve(sampleReply("groq"));
          },
        }),
      },
    });

    await llm.chat(
      [
        { role: "system", content: "Be brief." },
        { role: "user", content: "Ping" },
      ],
      { temperature: 0 },
    );

    expect(seen).toEqual([
      [
        { role: "system", content: "Be brief." },
        { role: "user", content: "Ping" },
      ],
    ]);
  });
});
