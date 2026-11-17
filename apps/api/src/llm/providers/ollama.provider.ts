import type { ChatMessage, ChatOptions, Reply } from "@askdocs/shared";
import { LLMError, toLLMError } from "../errors";
import type { LLMProvider } from "../llm-provider";
import { tokenUsage } from "../usage";

export interface OllamaProviderOptions {
  baseUrl: string;
  model: string;
}

interface OllamaChatResponse {
  model?: string;
  message?: { content?: string };
  prompt_eval_count?: number;
  eval_count?: number;
}

export class OllamaProvider implements LLMProvider {
  readonly name = "ollama";

  constructor(private readonly options: OllamaProviderOptions) {}

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<Reply> {
    const model = options?.model ?? this.options.model;
    try {
      const response = await fetch(`${this.options.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model,
          messages,
          stream: false,
          options: {
            temperature: options?.temperature,
            num_predict: options?.maxTokens,
          },
        }),
      });
      if (!response.ok) {
        const body = await response.text();
        throw new LLMError(`Ollama request failed (${response.status}): ${body.slice(0, 300)}`, {
          retryable: response.status === 429 || response.status >= 500,
          status: response.status,
          provider: this.name,
        });
      }
      const payload = (await response.json()) as OllamaChatResponse;
      const promptTokens = payload.prompt_eval_count ?? 0;
      const completionTokens = payload.eval_count ?? 0;
      return {
        text: payload.message?.content ?? "",
        usage: tokenUsage(promptTokens, completionTokens),
        provider: this.name,
        model: payload.model || model,
      };
    } catch (error) {
      throw toLLMError(this.name, error);
    }
  }
}
