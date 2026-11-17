import { randomUUID } from 'node:crypto';
import { index, sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const campaigns = sqliteTable(
  'campaigns',
  {
    id: text('id').primaryKey().$defaultFn(() => randomUUID()),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [index('campaigns_created_at_idx').on(table.createdAt)],
);
