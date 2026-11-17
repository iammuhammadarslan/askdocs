export class LLMError extends Error {
  readonly retryable: boolean;
  readonly status?: number;
  readonly provider?: string;

  constructor(
    message: string,
    options: {
      retryable: boolean;
      status?: number;
      provider?: string;
      cause?: unknown;
    },
  ) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "LLMError";
    this.retryable = options.retryable;
    this.status = options.status;
    this.provider = options.provider;
  }
}

export function readHttpStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return undefined;
  }
  const status = (error as { status: unknown }).status;
  return typeof status === "number" ? status : undefined;
}

export function isRetryableStatus(status: number | undefined): boolean {
  if (status === undefined) {
    return true;
  }
  return status === 408 || status === 429 || status >= 500;
}

export function toLLMError(provider: string, error: unknown): LLMError {
  if (error instanceof LLMError) {
    return error;
  }
  const status = readHttpStatus(error);
  const message = error instanceof Error ? error.message : "Unknown LLM error";
  return new LLMError(message, {
    retryable: isRetryableStatus(status),
    status,
    provider,
    cause: error,
  });
}
