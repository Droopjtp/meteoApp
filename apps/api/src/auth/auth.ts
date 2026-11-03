import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { betterAuth } from 'better-auth';
import { isNull } from 'drizzle-orm';
import type { Config } from '../config.js';
import type { Db } from '../db/client.js';
import * as schema from '../db/schema.js';

export function createAuth({ config, db }: { config: Config; db: Db }) {
  return betterAuth({
    baseURL: config.BETTER_AUTH_URL,
    basePath: '/api/auth',
    secret: config.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, { provider: 'pg', schema, usePlural: true }),
    // Passwords are hashed with scrypt (salted); email verification and reset need an
    // email provider, left for later.
    emailAndPassword: { enabled: true, minPasswordLength: 8 },
    databaseHooks: {
      user: {
        create: {
          // Chats created before authentication existed go to the first account.
          after: async (user) => {
            await db
              .update(schema.chats)
              .set({ userId: user.id })
              .where(isNull(schema.chats.userId));
          },
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type AuthUser = Auth['$Infer']['Session']['user'];
