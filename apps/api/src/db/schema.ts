import { index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const messageRole = pgEnum('message_role', ['user', 'assistant']);

export const chats = pgTable('chats', {
  id: uuid().primaryKey().defaultRandom(),
  title: text().notNull().default('Nouvelle conversation'),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const messages = pgTable(
  'messages',
  {
    id: uuid().primaryKey().defaultRandom(),
    // Total order of the transcript: rows written in one transaction share the same now().
    seq: integer().generatedAlwaysAsIdentity(),
    chatId: uuid()
      .notNull()
      .references(() => chats.id, { onDelete: 'cascade' }),
    role: messageRole().notNull(),
    // LLM content blocks (text, tool_use, tool_result) + resolved charts.
    content: jsonb().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('messages_chat_id_seq_idx').on(table.chatId, table.seq)],
);

/** Weather data fetched by `get_weather`, referenced by id from chart specs (also across turns). */
export const datasets = pgTable('datasets', {
  id: uuid().primaryKey(),
  chatId: uuid()
    .notNull()
    .references(() => chats.id, { onDelete: 'cascade' }),
  payload: jsonb().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/** Charts resolved by `render_chart`, keyed by the tool_use id so the UI can rebuild the conversation. */
export const charts = pgTable(
  'charts',
  {
    toolUseId: text().primaryKey(),
    chatId: uuid()
      .notNull()
      .references(() => chats.id, { onDelete: 'cascade' }),
    payload: jsonb().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('charts_chat_id_idx').on(table.chatId)],
);
