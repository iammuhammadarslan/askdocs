# AskDocs

AskDocs is a chat-with-your-docs assistant. You ask a question over your own documents and it answers with citations. The project starts as one model call and later grows into an agent that can plan, retrieve, and use tools.

This repository is the public follow-along for the 30-day LinkedIn series **Building AI apps for real: RAG and agents** by Muhammad Arslan. Each day adds one piece and leaves the repo in a state you can run.

## Stack

- Next.js (`apps/web`)
- NestJS (`apps/api`)
- PostgreSQL with pgvector
- Redis and BullMQ
- TypeScript
- pnpm workspaces
- Docker

Day 1 is the monorepo and a single LLM call. Day 2 estimates the prompt at about four characters per token and drops the oldest history until that prompt and the reserved reply fit the context window. The database, the queue, retrieval, and the web chat arrive on later days. The web app is a placeholder until then.

## Quick start

You need Node.js 22 or newer, pnpm 10, and Docker.

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm --filter @askdocs/api dev
```

The API listens on [http://localhost:3001](http://localhost:3001). The default provider is Ollama, so there is no API key to set. Start the optional local model service, pull a model once, then send a chat:

```bash
docker compose --profile ollama up -d
docker compose exec ollama ollama pull llama3.2

curl -s http://localhost:3001/chat \
  -H 'content-type: application/json' \
  -d '{"messages":[{"role":"user","content":"Say hello in one sentence."}]}'
```

To use a cloud provider instead, set `LLM_PROVIDER` to `openai`, `anthropic`, `gemini`, or `groq`, set `LLM_MODEL` if you want, and fill in that provider's key in `.env`.

Other commands:

```bash
pnpm build
pnpm lint
pnpm test
pnpm --filter @askdocs/web dev
```

The placeholder page runs at [http://localhost:3000](http://localhost:3000).

## Layout

| Path | What it is |
| --- | --- |
| `apps/api/src/llm` | `LLMProvider`, five adapters, the env factory, the retry/timeout/log wrapper, and the token budget |
| `apps/api/src/chat` | `POST /chat`, after the token budget |
| `apps/web` | Next.js placeholder |
| `packages/shared` | Message and reply schemas |
| `docs/days` | Lesson notes |

## Series index

| Day | Topic | Notes | LinkedIn |
| --- | --- | --- | --- |
| 1 | An LLM call is just a stateless HTTP request | [Day 1](docs/days/day-01.md) | TODO |
| 2 | Tokens are your bill and your limit | [Day 2](docs/days/day-02.md) | TODO |
| 3 | Coming soon | | |
| 4 | Coming soon | | |
| 5 | Coming soon | | |
| 6 | Coming soon | | |
| 7 | Coming soon | | |
| 8 | Coming soon | | |
| 9 | Coming soon | | |
| 10 | Coming soon | | |
| 11 | Coming soon | | |
| 12 | Coming soon | | |
| 13 | Coming soon | | |
| 14 | Coming soon | | |
| 15 | Coming soon | | |
| 16 | Coming soon | | |
| 17 | Coming soon | | |
| 18 | Coming soon | | |
| 19 | Coming soon | | |
| 20 | Coming soon | | |
| 21 | Coming soon | | |
| 22 | Coming soon | | |
| 23 | Coming soon | | |
| 24 | Coming soon | | |
| 25 | Coming soon | | |
| 26 | Coming soon | | |
| 27 | Coming soon | | |
| 28 | Coming soon | | |
| 29 | Coming soon | | |
| 30 | Coming soon | | |

## License

MIT. Copyright (c) 2026 Muhammad Arslan.
