import type { ChatSummary, ResolvedChart } from '@meteo/shared';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { charts, chats, datasets, messages } from '../db/schema.js';
import type { Dataset } from '../weather/types.js';
import type { StoredContent, StoredMessage } from './transcript.js';

export const DEFAULT_TITLE = 'Nouvelle conversation';
const TITLE_MAX_LENGTH = 60;

function toSummary(row: typeof chats.$inferSelect): ChatSummary {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// Every chat query is scoped by owner: another user's chat behaves as if it didn't exist.

export async function createChat(db: Db, userId: string): Promise<ChatSummary> {
  const [row] = await db.insert(chats).values({ userId, title: DEFAULT_TITLE }).returning();
  if (!row) throw new Error('Chat insert returned no row');
  return toSummary(row);
}

export async function listChats(db: Db, userId: string): Promise<ChatSummary[]> {
  const rows = await db
    .select()
    .from(chats)
    .where(eq(chats.userId, userId))
    .orderBy(desc(chats.updatedAt));
  return rows.map(toSummary);
}

export async function findChat(
  db: Db,
  chatId: string,
  userId: string,
): Promise<ChatSummary | null> {
  const [row] = await db
    .select()
    .from(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)));
  return row ? toSummary(row) : null;
}

export async function deleteChat(db: Db, chatId: string, userId: string): Promise<boolean> {
  const deleted = await db
    .delete(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
    .returning({ id: chats.id });
  return deleted.length > 0;
}

/** Uses the first user message as title, so no extra LLM call is needed. */
export async function setTitleIfDefault(db: Db, chatId: string, firstMessage: string) {
  const title =
    firstMessage.length > TITLE_MAX_LENGTH
      ? `${firstMessage.slice(0, TITLE_MAX_LENGTH - 1).trimEnd()}…`
      : firstMessage;
  await db
    .update(chats)
    .set({ title })
    .where(and(eq(chats.id, chatId), eq(chats.title, DEFAULT_TITLE)));
}

export async function getMessages(db: Db, chatId: string): Promise<StoredMessage[]> {
  const rows = await db
    .select({ id: messages.id, role: messages.role, content: messages.content })
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(asc(messages.seq));
  return rows.map((row) => ({ ...row, content: row.content as StoredContent }));
}

/** Appends messages atomically: an assistant tool_use is never stored without its tool_result. */
export async function appendMessages(
  db: Db,
  chatId: string,
  newMessages: { role: 'user' | 'assistant'; content: StoredContent }[],
) {
  await db.transaction(async (tx) => {
    await tx.insert(messages).values(newMessages.map((m) => ({ chatId, ...m })));
    await tx
      .update(chats)
      .set({ updatedAt: sql`now()` })
      .where(eq(chats.id, chatId));
  });
}

export async function saveDataset(db: Db, chatId: string, dataset: Dataset) {
  await db.insert(datasets).values({ id: dataset.id, chatId, payload: dataset });
}

export async function getDatasets(db: Db, chatId: string): Promise<Map<string, Dataset>> {
  const rows = await db.select().from(datasets).where(eq(datasets.chatId, chatId));
  return new Map(rows.map((row) => [row.id, row.payload as Dataset]));
}

export async function saveChart(db: Db, chatId: string, chart: ResolvedChart) {
  await db.insert(charts).values({ toolUseId: chart.id, chatId, payload: chart });
}

export async function getCharts(db: Db, chatId: string): Promise<Map<string, ResolvedChart>> {
  const rows = await db.select().from(charts).where(eq(charts.chatId, chatId));
  return new Map(rows.map((row) => [row.toolUseId, row.payload as ResolvedChart]));
}
