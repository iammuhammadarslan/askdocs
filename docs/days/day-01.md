# Day 1 — An LLM call is just a stateless HTTP request

The model does not remember the last turn. Each call is a new HTTP request with whatever messages you put in the body. A conversation only exists because you resend the transcript. You pay for those tokens every time, including the turns the model has already seen.

That is the whole contract: messages in, text and usage out. Provider SDKs are different shapes of that same request.

## One interface

AskDocs talks to OpenAI, Anthropic, Gemini, Groq, and Ollama through one TypeScript interface:

```ts
chat(messages, options) => Promise<Reply>
```

`messages` are typed roles (`system`, `user`, `assistant`). `options` carries model, temperature, and max tokens. `Reply` carries the text, token usage, and which provider and model produced it.

The rest of the app depends on that interface. Switching vendors is `LLM_PROVIDER` and `LLM_MODEL` in the environment. The factory builds the matching adapter. Nothing else changes.

## Retries, timeouts, and logs live in one wrapper

Each adapter stays small. It translates messages, calls the official SDK (or `fetch` for Ollama), and translates the response.

Timeouts, retries, and logging wrap every adapter in one place. A 429 or a dropped connection retries with backoff. A 401 does not. Logs record provider, model, latency, and token counts. They do not record the prompt.

## Local Ollama for development

The default provider is Ollama, so Day 1 runs without an API key. Start it with Docker when you want a local model:

```bash
docker compose --profile ollama up -d
```

Cloud providers use the same `chat()` method once you set a key.

## Where to look

- `packages/shared` — message and reply schemas
- `apps/api/src/llm` — interface, adapters, factory, wrapper
- `POST /chat` — sends the request body through that interface
