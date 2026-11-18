import type { ChatMessage } from "@askdocs/shared";

/**
 * About four characters per token.
 * The real tokenizer varies by model, so this is a budget estimate, not a bill.
 */
export const CHARS_PER_TOKEN = 4;

export function countTokens(text: string): number {
  if (text.length === 0) {
    return 0;
  }
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export interface TokenBudgetInput {
  system: string;
  history: readonly ChatMessage[];
  docs: string;
  maxOutput: number;
  contextWindow: number;
}

export interface TokenBudget {
  system: string;
  history: ChatMessage[];
  docs: string;
  maxOutput: number;
  contextWindow: number;
  /** Estimated tokens for system + kept history + docs. Does not include maxOutput. */
  promptTokens: number;
  droppedMessages: number;
}

export class TokenBudgetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TokenBudgetError";
  }
}

/**
 * Drop the oldest history messages until system + history + docs + maxOutput
 * fit in the context window. System and docs stay. If those two plus the
 * reserved reply still do not fit, throw.
 */
export function fitToBudget(input: TokenBudgetInput): TokenBudget {
  const contextWindow = positiveInteger(input.contextWindow, "contextWindow");
  const maxOutput = positiveInteger(input.maxOutput, "maxOutput");
  const systemTokens = countTokens(input.system);
  const docsTokens = countTokens(input.docs);
  const reserved = systemTokens + docsTokens + maxOutput;

  if (reserved > contextWindow) {
    throw new TokenBudgetError(
      `The system prompt (${tokenLabel(systemTokens)}) and docs (${tokenLabel(docsTokens)}), plus ${tokenLabel(maxOutput)} reserved for the reply, exceed the context window of ${contextWindow}. Shorten the prompt or the documents.`,
    );
  }

  const history = [...input.history];
  let droppedMessages = 0;
  while (history.length > 0 && reserved + countMessages(history) > contextWindow) {
    history.shift();
    droppedMessages += 1;
  }

  return {
    system: input.system,
    history,
    docs: input.docs,
    maxOutput,
    contextWindow,
    promptTokens: systemTokens + docsTokens + countMessages(history),
    droppedMessages,
  };
}

function countMessages(messages: readonly ChatMessage[]): number {
  return messages.reduce((total, message) => total + countTokens(message.content), 0);
}

function tokenLabel(count: number): string {
  return `${count} ${count === 1 ? "token" : "tokens"}`;
}

function positiveInteger(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 1) {
    throw new TokenBudgetError(`${name} must be a positive integer.`);
  }
  return value;
}
