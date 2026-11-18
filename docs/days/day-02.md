# Day 2 — Tokens are your bill and your limit

A token is the piece of text a model reads and writes. It is not a word. For English, a token is about four characters. That ratio is only an estimate. The real tokenizer is different for every model, so the same sentence can be a different number of tokens on OpenAI, Anthropic, Gemini, Groq, and Ollama.

AskDocs uses the four-character estimate so the budget check does not depend on a provider. The provider still reports the real prompt and completion counts on the reply. Those real counts are what you record.

Tokens decide the bill. Providers charge for input and output separately, and a stateless call sends the whole transcript every turn, so you pay for old turns again.

Tokens decide the limit. The context window is everything that has to fit in one request: the system prompt, the history, the documents, and the reply, which does not exist yet. If the sum is over the window, the provider rejects the call or drops the start of the prompt.

Reserve room for the reply first, then trim history:

```ts
const used = count(system) + count(history) + count(docs);
if (used + maxOutput > contextWindow) trimOldestHistory();
```

`fitToBudget` drops the oldest history messages until that sum fits. It does not drop the system prompt or the documents. If those two plus `maxOutput` already exceed the window, it throws. There is nothing older to remove, and the model cannot answer a prompt it cannot read.

That check prevents two failures: a request the provider will reject for length, and a reply with no tokens left because the prompt already filled the window. The newest turns stay. The oldest turns are the ones that go.

`LLM_CONTEXT_WINDOW` and `LLM_MAX_OUTPUT_TOKENS` override the per-provider defaults. `maxOutput` is also the completion cap passed to `chat()`, so the model cannot spend more than the budget reserved for it. The reply still records prompt and completion usage from the provider.

## Where to look

- `apps/api/src/llm/token-budget.ts` — `countTokens` and `fitToBudget`
- `apps/api/src/chat/fit-chat.ts` — splits system text from history, then calls `fitToBudget`
- `apps/api/src/llm/usage.ts` — prompt and completion tokens on each reply
- `POST /chat` — fits the messages, then calls `chat()`

## LinkedIn

TODO
