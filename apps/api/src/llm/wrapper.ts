import type { ChatMessage, ChatOptions, Reply } from "@askdocs/shared";
import { LLMError, toLLMError } from "./errors";
import { ConsoleLLMLogger, type LLMLogger } from "./logger";
import type { LLMProvider } from "./llm-provider";
import { backoffMs, delay, withTimeout } from "./timeout";

export interface RetryPolicy {
  maxRetries: number;
  timeoutMs: number;
}

/**
 * Shared retry, timeout, and logging for every provider.
 * Adapters stay small; this is the only place those policies live.
 */
export class ResilientLLMProvider implements LLMProvider {
  readonly name: string;

  constructor(
    private readonly inner: LLMProvider,
    private readonly policy: RetryPolicy,
    private readonly logger: LLMLogger = new ConsoleLLMLogger(),
    private readonly sleep: (ms: number) => Promise<void> = delay,
  ) {
    this.name = inner.name;
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<Reply> {
    const attempts = this.policy.maxRetries + 1;
    let lastError: LLMError | undefined;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const started = Date.now();
      try {
        const reply = await withTimeout(
          this.inner.chat(messages, options),
          this.policy.timeoutMs,
          this.name,
        );
        this.logger.info("llm.chat.ok", {
          provider: reply.provider,
          model: reply.model,
          attempt,
          durationMs: Date.now() - started,
          promptTokens: reply.usage.promptTokens,
          completionTokens: reply.usage.completionTokens,
          totalTokens: reply.usage.totalTokens,
        });
        return reply;
      } catch (error) {
        const llmError = error instanceof LLMError ? error : toLLMError(this.name, error);
        lastError = llmError;
        const willRetry = llmError.retryable && attempt < attempts;
        this.logger.warn(willRetry ? "llm.chat.retry" : "llm.chat.failed", {
          provider: this.name,
          model: options?.model,
          attempt,
          durationMs: Date.now() - started,
          status: llmError.status,
          retryable: llmError.retryable,
          error: llmError.message,
        });
        if (!willRetry) {
          break;
        }
        await this.sleep(backoffMs(attempt));
      }
    }

    throw lastError ?? new LLMError("LLM call failed", { retryable: false, provider: this.name });
  }
}
