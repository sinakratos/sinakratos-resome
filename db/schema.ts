import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const resumeContent=sqliteTable('resume_content',{id:integer('id').primaryKey(),content:text('content').notNull(),revision:integer('revision').notNull().default(1)});
