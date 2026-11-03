# Météo Chat

Chat with an LLM about live weather data — answers come back as charts in the conversation.

## Stack

| Layer    | Tech                                                        |
| -------- | ----------------------------------------------------------- |
| Monorepo | pnpm workspaces (`apps/web`, `apps/api`, `packages/shared`) |
| Front    | Vite, React 19, TypeScript, CSS Modules, TanStack Query     |
| Back     | Fastify 5, TypeScript, Zod (validation + typed routes)      |
| Database | PostgreSQL 18, Drizzle ORM (migrations run on API startup)  |
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

## Run with Docker

```bash
cp .env.example .env   # then set your Anthropic credentials
docker compose up --build
```

App: http://localhost:8080

A `Makefile` wraps the Docker Compose commands (`make up`, `make down`, `make rebuild`, `make logs s=api`, `make psql`, `make clean`…). Run `make` to list them all.

## Run locally (dev, hot reload)

Requires Node 24 (`nvm use`) and pnpm (`corepack enable pnpm`).

```bash
cp .env.example .env   # then set your Anthropic credentials
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
