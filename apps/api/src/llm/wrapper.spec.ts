import type { ChatMessage, Reply } from "@askdocs/shared";
import { LLMError } from "./errors";
import type { LLMLogger } from "./logger";
import type { LLMProvider } from "./llm-provider";
import { backoffMs } from "./timeout";
import { ResilientLLMProvider } from "./wrapper";

const messages: ChatMessage[] = [{ role: "user", content: "secret phrase" }];

function reply(text = "ok"): Reply {
  return {
    text,
    usage: { promptTokens: 4, completionTokens: 6, totalTokens: 10 },
    provider: "ollama",
    model: "llama3.2",
  };
}

function captureLogger(): { logger: LLMLogger; events: Array<{ event: string; meta?: Record<string, unknown> }> } {
  const events: Array<{ event: string; meta?: Record<string, unknown> }> = [];
  const logger: LLMLogger = {
    info: (event, meta) => events.push({ event, meta }),
    warn: (event, meta) => events.push({ event, meta }),
  };
  return { logger, events };
}

describe("ResilientLLMProvider", () => {
  it("returns the inner reply and logs usage without the prompt", async () => {
    const { logger, events } = captureLogger();
    const inner: LLMProvider = {
      name: "ollama",
      chat: () => Promise.resolve(reply()),
    };
    const llm = new ResilientLLMProvider(inner, { maxRetries: 2, timeoutMs: 50 }, logger, async () => {});

    const result = await llm.chat(messages);

    expect(result).toEqual(reply());
    expect(events).toEqual([
      {
        event: "llm.chat.ok",
        meta: {
          provider: "ollama",
          model: "llama3.2",
          attempt: 1,
          durationMs: expect.any(Number) as number,
          promptTokens: 4,
          completionTokens: 6,
          totalTokens: 10,
        },
      },
    ]);
    expect(JSON.stringify(events)).not.toContain("secret phrase");
  });

  it("retries a retryable error and then returns the reply", async () => {
    const sleeps: number[] = [];
    let calls = 0;
    const inner: LLMProvider = {
      name: "openai",
      chat: () => {
        calls += 1;
        if (calls < 3) {
          return Promise.reject(new LLMError("rate limited", { retryable: true, status: 429, provider: "openai" }));
        }
        return Promise.resolve(reply("recovered"));
      },
    };
    const { logger, events } = captureLogger();
    const llm = new ResilientLLMProvider(
      inner,
      { maxRetries: 2, timeoutMs: 50 },
      logger,
      (ms) => {
        sleeps.push(ms);
        return Promise.resolve();
      },
    );

    const result = await llm.chat(messages);

    expect(result.text).toBe("recovered");
    expect(calls).toBe(3);
    expect(sleeps).toEqual([backoffMs(1), backoffMs(2)]);
    expect(events.map((entry) => entry.event)).toEqual(["llm.chat.retry", "llm.chat.retry", "llm.chat.ok"]);
  });

  it("does not retry a non-retryable error", async () => {
    let calls = 0;
    const inner: LLMProvider = {
      name: "anthropic",
      chat: () => {
        calls += 1;
        return Promise.reject(
          new LLMError("invalid api key", { retryable: false, status: 401, provider: "anthropic" }),
        );
      },
    };
    const llm = new ResilientLLMProvider(inner, { maxRetries: 3, timeoutMs: 50 }, undefined, async () => {
      throw new Error("sleep should not run");
    });

    await expect(llm.chat(messages)).rejects.toMatchObject({ status: 401, retryable: false });
    expect(calls).toBe(1);
  });

  it("stops after the last retry", async () => {
    let calls = 0;
    const inner: LLMProvider = {
      name: "groq",
      chat: () => {
        calls += 1;
        return Promise.reject(new LLMError("unavailable", { retryable: true, status: 503, provider: "groq" }));
      },
    };
    const llm = new ResilientLLMProvider(inner, { maxRetries: 2, timeoutMs: 50 }, undefined, async () => {});

    await expect(llm.chat(messages)).rejects.toMatchObject({ message: "unavailable", status: 503 });
    expect(calls).toBe(3);
  });

  it("times out a hung call and retries", async () => {
    const pending: Array<(value: Reply) => void> = [];
    let calls = 0;
    const inner: LLMProvider = {
      name: "gemini",
      chat: () => {
        calls += 1;
        if (calls === 1) {
          return new Promise<Reply>((resolve) => {
            pending.push(resolve);
          });
        }
        return Promise.resolve(reply("after timeout"));
      },
    };
    const { logger, events } = captureLogger();
    const llm = new ResilientLLMProvider(inner, { maxRetries: 1, timeoutMs: 20 }, logger, async () => {});

    const result = await llm.chat(messages);
    pending.forEach((resolve) => resolve(reply("late")));

    expect(result.text).toBe("after timeout");
    expect(calls).toBe(2);
    expect(events[0]).toMatchObject({
      event: "llm.chat.retry",
      meta: { provider: "gemini", retryable: true },
    });
  });
});
