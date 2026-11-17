import type { ChatMessage, ChatOptions, Reply } from "@askdocs/shared";

/**
 * One chat call. The model is stateless: send every message you want it to see.
 * Adapters implement this. The rest of AskDocs depends on it, not on a vendor SDK.
 */
export interface LLMProvider {
  readonly name: string;
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<Reply>;
}

export const LLM_PROVIDER = Symbol("LLM_PROVIDER");
