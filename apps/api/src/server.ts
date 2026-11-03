import { fileURLToPath } from 'node:url';
import { buildApp } from './app.js';
import { createAuth } from './auth/auth.js';
import { loadConfig } from './config.js';
import { createDb, runMigrations } from './db/client.js';
import { createLlmClient } from './llm/client.js';

const config = loadConfig();
const { db, pool } = createDb(config.DATABASE_URL);

// Works both from src/ (tsx) and dist/ (bundled): migrations live at the package root.
await runMigrations(db, fileURLToPath(new URL('../drizzle', import.meta.url)));

const app = buildApp({ config, db, llm: createLlmClient(), auth: createAuth({ config, db }) });

const shutdown = async () => {
  await app.close();
  await pool.end();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

await app.listen({ host: config.HOST, port: config.PORT });

// Don't block startup on the LLM: the app stays usable (chat history...) and the front shows the error.
const llmStatus = await app.checkLlmStatus();
if (llmStatus.status === 'ok') {
  app.log.info('Anthropic credentials OK');
} else {
  app.log.warn({ code: llmStatus.code }, llmStatus.message);
}
