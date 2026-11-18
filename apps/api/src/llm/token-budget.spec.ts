import type { ChatMessage } from "@askdocs/shared";
import { countTokens, fitToBudget, TokenBudgetError, type TokenBudgetInput } from "./token-budget";

function user(content: string): ChatMessage {
  return { role: "user", content };
}

function budget(overrides: Partial<TokenBudgetInput> = {}): TokenBudgetInput {
  return {
    system: "",
    history: [],
    docs: "",
    maxOutput: 4,
    contextWindow: 16,
    ...overrides,
  };
}

describe("countTokens", () => {
  it("estimates about 4 characters per token and rounds up", () => {
    expect(countTokens("")).toBe(0);
    expect(countTokens("abcd")).toBe(1);
    expect(countTokens("abcde")).toBe(2);
    expect(countTokens("a".repeat(7))).toBe(2);
  });
});

describe("fitToBudget", () => {
  it("keeps history when system, docs, history, and the reserved reply fit", () => {
    const history = [user("old"), user("new")];
    const fitted = fitToBudget(budget({ system: "Abcd", docs: "Wxyz", history, maxOutput: 2, contextWindow: 8 }));

    expect(fitted.history).toEqual(history);
    expect(fitted.droppedMessages).toBe(0);
    expect(fitted.promptTokens).toBe(
      countTokens("Abcd") + countTokens("old") + countTokens("new") + countTokens("Wxyz"),
    );
    expect(fitted.promptTokens + fitted.maxOutput).toBeLessThanOrEqual(fitted.contextWindow);
  });

  it("drops the oldest history messages until the reserved reply fits", () => {
    const oldest = user("a".repeat(8));
    const middle = user("b".repeat(8));
    const newest = user("Hi");
    const history = [oldest, middle, newest];

    const fitted = fitToBudget(budget({ history, maxOutput: 4, contextWindow: 6 }));

    expect(fitted.history).toEqual([newest]);
    expect(fitted.droppedMessages).toBe(2);
    expect(fitted.promptTokens).toBe(1);
    expect(history).toEqual([oldest, middle, newest]);
  });

  it("counts documents, so a long doc leaves less room for history", () => {
    const history = [user("old-turn"), user("Hi")];
    const fitted = fitToBudget(
      budget({
        history,
        docs: "d".repeat(8),
        maxOutput: 2,
        contextWindow: 5,
      }),
    );

    expect(fitted.history).toEqual([user("Hi")]);
    expect(fitted.promptTokens).toBe(countTokens("d".repeat(8)) + countTokens("Hi"));
  });

  it("drops every history message without throwing when system and docs still fit", () => {
    const fitted = fitToBudget(
      budget({
        system: "Abcd",
        docs: "Wxyz",
        history: [user("a".repeat(40))],
        maxOutput: 2,
        contextWindow: 4,
      }),
    );

    expect(fitted.history).toEqual([]);
    expect(fitted.droppedMessages).toBe(1);
    expect(fitted.promptTokens).toBe(2);
  });

  it("throws when the system prompt and docs leave no room for the reserved reply", () => {
    expect(() =>
      fitToBudget(
        budget({
          system: "Abcd",
          docs: "Wxyz",
          history: [],
          maxOutput: 3,
          contextWindow: 4,
        }),
      ),
    ).toThrow(TokenBudgetError);

    expect(() =>
      fitToBudget(
        budget({
          system: "a".repeat(40),
          docs: "doc",
          maxOutput: 1,
          contextWindow: 8,
        }),
      ),
    ).toThrow(/system prompt \(10 tokens\) and docs \(1 token\).*context window of 8/);
  });

  it("rejects a context window or reply budget that is not a positive integer", () => {
    expect(() => fitToBudget(budget({ contextWindow: 0 }))).toThrow(/contextWindow/);
    expect(() => fitToBudget(budget({ maxOutput: 1.5 }))).toThrow(/maxOutput/);
  });
});
