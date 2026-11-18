import type { ChatMessage } from "@askdocs/shared";
import { TokenBudgetError } from "../llm/token-budget";
import { fitChatMessages } from "./fit-chat";

describe("fitChatMessages", () => {
  it("keeps the system prompt, drops the oldest turns, and leaves the latest question", () => {
    const messages: ChatMessage[] = [
      { role: "user", content: "a".repeat(40) },
      { role: "system", content: "Abcd" },
      { role: "assistant", content: "b".repeat(12) },
      { role: "user", content: "Hi" },
    ];

    expect(fitChatMessages(messages, { contextWindow: 8, maxOutput: 4 })).toEqual([
      { role: "system", content: "Abcd" },
      { role: "user", content: "Hi" },
    ]);
  });

  it("counts documents against the same window", () => {
    const messages: ChatMessage[] = [
      { role: "user", content: "old-turn" },
      { role: "user", content: "Hi" },
    ];

    expect(
      fitChatMessages(messages, { contextWindow: 5, maxOutput: 2, docs: "d".repeat(8) }),
    ).toEqual([{ role: "user", content: "Hi" }]);
  });

  it("throws when the system prompt and docs leave no room for the reply", () => {
    const messages: ChatMessage[] = [{ role: "system", content: "x".repeat(40) }];

    expect(() => fitChatMessages(messages, { contextWindow: 8, maxOutput: 4 })).toThrow(TokenBudgetError);
    expect(() => fitChatMessages(messages, { contextWindow: 8, maxOutput: 4 })).toThrow(/context window of 8/);
  });

  it("throws when the latest message itself does not fit", () => {
    const messages: ChatMessage[] = [{ role: "user", content: "x".repeat(40) }];

    expect(() => fitChatMessages(messages, { contextWindow: 8, maxOutput: 4 })).toThrow(
      /latest message does not fit/,
    );
  });
});
