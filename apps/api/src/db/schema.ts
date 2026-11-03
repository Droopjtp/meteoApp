import { index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

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
    chatId: uuid()
      .notNull()
      .references(() => chats.id, { onDelete: 'cascade' }),
    role: messageRole().notNull(),
    // LLM content blocks (text, tool_use, tool_result) + resolved charts.
    content: jsonb().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('messages_chat_id_created_at_idx').on(table.chatId, table.createdAt)],
);
