# Météo Chat

Chat with an LLM about live weather data — answers come back as charts in the conversation.

## Features

- Natural-language questions about any place and period: forecasts up to 16 days ahead, history back to 1940 (e.g. _"How will temperatures evolve in Lyon this week?"_, _"Compare the rainfall in Paris and Marseille over the last 3 days"_)
- Answers streamed token by token, with live tool progress ("Météo · Lyon (3 nov. → 9 nov.)")
- Charts chosen by the LLM: type (line / bar / area, per-series overrides), series, locations, granularity
- Heating & cooling degree days (base 18 °C), relevant for building energy needs
- Out-of-range requests (beyond 16 days, before 1940, unknown place) handled gracefully: the LLM explains and suggests an alternative
- Chat history: new chat, list, delete, deep links (`/c/:chatId`)
- Accounts (email + password): each user only sees their own chats

## How it works

```
React ──POST /api/chats/:id/messages──▶ Fastify ──stream──▶ Claude (tool use)
  ▲                                       │  ▲
  └────────── Server-Sent Events ─────────┘  └── get_weather ──▶ Open-Meteo (geocoding, forecast, archive)
     text deltas · tool status · charts          render_chart ──▶ chart resolved with real data
```

1. **`get_weather`** geocodes the place, picks the API from the dates (archive before today − 92 days, forecast after, both merged when a period straddles them), validates the range, and stores the dataset in Postgres. The LLM only receives a `datasetId` and a compact summary (min / max / mean or total, values for short periods): **the data points never go through the LLM**, which keeps answers fast, cheap and free of hallucinated numbers.
2. **`render_chart`** takes a chart spec from the LLM (title, type, series = `datasetId` + variable). The backend validates it (Zod schema shared with the front), resolves it with the stored data and streams the chart to the UI. Invalid specs go back to the LLM as tool errors, so it fixes its call.
3. Series with different units are drawn as **stacked panels sharing the time axis** (synchronised tooltip), never as a dual Y axis.
4. The raw LLM transcript (including tool calls) is stored as-is so it can be replayed to the API; the UI view (user bubbles, assistant text + charts) is derived from it.

### Performance

- Streaming (SSE) end to end, rendered at most once per animation frame
- Open-Meteo responses cached in memory (forecast 15 min, archive 6 h, geocoding 24 h)
- Parallel tool calls (one `get_weather` per city run concurrently)
- Prompt caching on tools + system prompt + history; low LLM effort by default (`LLM_EFFORT`)
- Initial bundle ~84 kB gzip: Recharts lives in its own chunk, preloaded while the browser is idle; the front imports only the shared _types_ (responses are validated server-side), which keeps Zod out of the bundle
- Messages memoised so only the streaming one re-renders
- nginx: gzip, immutable caching of hashed assets, unbuffered proxy for SSE

## Stack

| Layer    | Tech                                                        |
| -------- | ----------------------------------------------------------- |
| Monorepo | pnpm workspaces (`apps/web`, `apps/api`, `packages/shared`) |
| Front    | Vite, React 19, TypeScript, CSS Modules, TanStack Query     |
| Back     | Fastify 5, TypeScript, Zod (validation + typed routes)      |
| Database | PostgreSQL 18, Drizzle ORM (migrations run on API startup)  |
| Auth     | Better Auth (email + password, cookie sessions)             |
| LLM      | Claude (Anthropic API) with tool use                        |
| Weather  | [Open-Meteo](https://open-meteo.com/) (forecast + archive)  |
| Tooling  | ESLint, Prettier, Vitest, Docker Compose                    |

`packages/shared` holds the Zod schemas shared by the front and the back (API contract, chart spec).

## Anthropic credentials

Credentials are optional at startup and resolved by the Anthropic SDK, first match wins:

1. `ANTHROPIC_API_KEY` in `.env`
2. `ANTHROPIC_AUTH_TOKEN` in `.env`
3. A profile from `ant auth login` (Anthropic CLI) — local dev only, the Docker container can't see it

Without any of them the app still starts (with a warning in the API logs), `GET /api/llm/status` reports what is missing and the UI shows it in a banner. Invalid or expired credentials, rate limits and API outages are mapped to explicit error codes (`llm_credentials_missing`, `llm_credentials_invalid`, `llm_rate_limited`, `llm_unavailable`).

> A claude.ai / Claude Code subscription login is deliberately not used: Anthropic doesn't allow third-party apps to rely on it.

## Authentication

[Better Auth](https://www.better-auth.com/), self-hosted in the Fastify API (`/api/auth/*`), users and sessions in our own Postgres (Drizzle adapter).

- **Passwords**: never stored in clear: salted scrypt hash in `accounts.password`; 8 to 128 characters.
- **Sessions**: random token in an `HttpOnly; SameSite=Lax` cookie signed with `BETTER_AUTH_SECRET` (7 days). The front and the API share one origin (nginx / Vite proxy): no CORS, no token in JavaScript, and the SSE stream is authenticated by the same cookie.
- **CSRF**: Better Auth rejects auth requests from untrusted origins (`BETTER_AUTH_URL`).
- **Authorization**: a `preHandler` hook (`requireUser`) guards every `/api/chats` route (401 without a valid session), and every query is scoped by `user_id`: another user's chat answers **404**, as if it didn't exist.
- **Existing data**: chats created before authentication have no owner; the first account created claims them.
- The front shows a sign-in / sign-up screen; any 401 (expired or revoked session) brings it back.

Not done yet (needs an email provider): email verification and password reset. OAuth providers (GitHub, Google) are a few lines in `apps/api/src/auth/auth.ts` once the app has a public callback URL.

## Run with Docker

```bash
make env               # creates .env and generates BETTER_AUTH_SECRET
# then set your Anthropic credentials in .env
docker compose up --build
```

App: http://localhost:8080

A `Makefile` wraps the Docker Compose commands (`make up`, `make down`, `make rebuild`, `make logs s=api`, `make psql`, `make clean`…). Run `make` to list them all.

## Run locally (dev, hot reload)

Requires Node 24 (`nvm use`) and pnpm (`corepack enable pnpm`).

```bash
make env               # creates .env and generates BETTER_AUTH_SECRET
# then set your Anthropic credentials in .env
pnpm install
make dev               # starts the DB container, then `pnpm dev`
```

App: http://localhost:5173 (Vite proxies `/api` to the API on port 3000)

## Scripts

| Command                                | Description                          |
| -------------------------------------- | ------------------------------------ |
| `pnpm dev`                             | Start API and web in watch mode      |
| `pnpm build`                           | Build all packages                   |
| `pnpm lint` / `pnpm lint:fix`          | ESLint                               |
| `pnpm format` / `pnpm format:check`    | Prettier                             |
| `pnpm typecheck`                       | TypeScript on all packages           |
| `pnpm test`                            | Vitest                               |
| `pnpm --filter @meteo/api db:generate` | Generate a migration from the schema |
