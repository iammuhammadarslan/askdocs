import OpenAI from "openai";
import type { ChatMessage, ChatOptions, Reply } from "@askdocs/shared";
import { toLLMError } from "../errors";
import type { LLMProvider } from "../llm-provider";
import { tokenUsage } from "../usage";

export interface OpenAIProviderOptions {
  apiKey: string;
  model: string;
}

export class OpenAIProvider implements LLMProvider {
  readonly name = "openai";
  private client: OpenAI | undefined;

  constructor(private readonly options: OpenAIProviderOptions) {}

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<Reply> {
    const model = options?.model ?? this.options.model;
    try {
      const response = await this.getClient().chat.completions.create({
        model,
        messages: messages.map((message) => toOpenAIMessage(message)),
        temperature: options?.temperature,
        max_completion_tokens: options?.maxTokens,
      });
      return {
        text: response.choices[0]?.message?.content ?? "",
        usage: tokenUsage(
          response.usage?.prompt_tokens ?? 0,
          response.usage?.completion_tokens ?? 0,
          response.usage?.total_tokens,
        ),
        provider: this.name,
        model: response.model || model,
      };
    } catch (error) {
      throw toLLMError(this.name, error);
    }
  }

  private getClient(): OpenAI {
    this.client ??= new OpenAI({ apiKey: this.options.apiKey });
    return this.client;
  }
}

function toOpenAIMessage(message: ChatMessage): OpenAI.ChatCompletionMessageParam {
  switch (message.role) {
    case "system":
      return { role: "system", content: message.content };
    case "user":
      return { role: "user", content: message.content };
    case "assistant":
      return { role: "assistant", content: message.content };
  }
}
