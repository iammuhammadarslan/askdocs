import { GoogleGenAI } from "@google/genai";
import type { ChatMessage, ChatOptions, Reply } from "@askdocs/shared";
import { LLMError, toLLMError } from "../errors";
import type { LLMProvider } from "../llm-provider";
import { tokenUsage } from "../usage";

export interface GeminiProviderOptions {
  apiKey: string;
  model: string;
}

export class GeminiProvider implements LLMProvider {
  readonly name = "gemini";
  private client: GoogleGenAI | undefined;

  constructor(private readonly options: GeminiProviderOptions) {}

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<Reply> {
    const model = options?.model ?? this.options.model;
    const system = messages
      .filter((message) => message.role === "system")
      .map((message) => message.content)
      .join("\n\n");
    const contents = messages
      .filter((message) => message.role !== "system")
      .map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }],
      }));
    if (contents.length === 0) {
      throw new LLMError("Gemini requires at least one user or assistant message.", {
        retryable: false,
        status: 400,
        provider: this.name,
      });
    }

    try {
      const response = await this.getClient().models.generateContent({
        model,
        contents,
        config: {
          temperature: options?.temperature,
          maxOutputTokens: options?.maxTokens,
          ...(system ? { systemInstruction: system } : {}),
        },
      });
      const usage = response.usageMetadata;
      return {
        text: response.text ?? "",
        usage: tokenUsage(
          usage?.promptTokenCount ?? 0,
          usage?.candidatesTokenCount ?? 0,
          usage?.totalTokenCount,
        ),
        provider: this.name,
        model: response.modelVersion || model,
      };
    } catch (error) {
      throw toLLMError(this.name, error);
    }
  }

  private getClient(): GoogleGenAI {
    this.client ??= new GoogleGenAI({ apiKey: this.options.apiKey });
    return this.client;
  }
}
