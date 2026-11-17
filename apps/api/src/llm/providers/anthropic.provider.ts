import Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage, ChatOptions, Reply } from "@askdocs/shared";
import { LLMError, toLLMError } from "../errors";
import type { LLMProvider } from "../llm-provider";
import { tokenUsage } from "../usage";

export interface AnthropicProviderOptions {
  apiKey: string;
  model: string;
}

const DEFAULT_MAX_TOKENS = 1024;

export class AnthropicProvider implements LLMProvider {
  readonly name = "anthropic";
  private client: Anthropic | undefined;

  constructor(private readonly options: AnthropicProviderOptions) {}

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<Reply> {
    const model = options?.model ?? this.options.model;
    const system = messages
      .filter((message) => message.role === "system")
      .map((message) => message.content)
      .join("\n\n");
    const conversation = messages.filter(
      (message): message is ChatMessage & { role: "user" | "assistant" } => message.role !== "system",
    );
    if (conversation.length === 0) {
      throw new LLMError("Anthropic requires at least one user or assistant message.", {
        retryable: false,
        status: 400,
        provider: this.name,
      });
    }

    try {
      // Current Claude models reject temperature. The shared option still
      // applies to providers that sample with it.
      const response = await this.getClient().messages.create({
        model,
        max_tokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
        ...(system ? { system } : {}),
        messages: conversation.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      });
      const text = response.content
        .map((block) => (block.type === "text" ? block.text : ""))
        .join("");
      const promptTokens =
        response.usage.input_tokens +
        (response.usage.cache_creation_input_tokens ?? 0) +
        (response.usage.cache_read_input_tokens ?? 0);
      return {
        text,
        usage: tokenUsage(promptTokens, response.usage.output_tokens),
        provider: this.name,
        model: response.model,
      };
    } catch (error) {
      throw toLLMError(this.name, error);
    }
  }

  private getClient(): Anthropic {
    this.client ??= new Anthropic({ apiKey: this.options.apiKey });
    return this.client;
  }
}
