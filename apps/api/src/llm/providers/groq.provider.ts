import Groq from "groq-sdk";
import type { ChatMessage, ChatOptions, Reply } from "@askdocs/shared";
import { toLLMError } from "../errors";
import type { LLMProvider } from "../llm-provider";
import { tokenUsage } from "../usage";

export interface GroqProviderOptions {
  apiKey: string;
  model: string;
}

export class GroqProvider implements LLMProvider {
  readonly name = "groq";
  private client: Groq | undefined;

  constructor(private readonly options: GroqProviderOptions) {}

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<Reply> {
    const model = options?.model ?? this.options.model;
    try {
      const response = await this.getClient().chat.completions.create({
        model,
        messages: messages.map((message) => toGroqMessage(message)),
        temperature: options?.temperature,
        max_tokens: options?.maxTokens,
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

  private getClient(): Groq {
    this.client ??= new Groq({ apiKey: this.options.apiKey });
    return this.client;
  }
}

function toGroqMessage(message: ChatMessage): Groq.Chat.ChatCompletionMessageParam {
  switch (message.role) {
    case "system":
      return { role: "system", content: message.content };
    case "user":
      return { role: "user", content: message.content };
    case "assistant":
      return { role: "assistant", content: message.content };
  }
}
