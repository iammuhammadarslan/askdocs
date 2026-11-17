import { LLMError } from "./errors";

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function backoffMs(attempt: number): number {
  return Math.min(250 * 2 ** (attempt - 1), 4_000);
}

/**
 * Rejects when the provider does not settle in time.
 * The underlying request is not cancelled; the caller just stops waiting.
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, provider: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new LLMError(`LLM call timed out after ${timeoutMs}ms`, {
          retryable: true,
          provider,
        }),
      );
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
