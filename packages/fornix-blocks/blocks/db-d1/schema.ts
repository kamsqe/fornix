/**
 * Database schema — define your tables here.
 *
 * This file is imported by the db client and used by Drizzle Kit
 * for migrations. Add tables using the Drizzle ORM API:
 *
 *   import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
 *
 *   export const users = sqliteTable("users", {
 *     id: text("id").primaryKey(),
 *     email: text("email").notNull().unique(),
 *     name: text("name"),
 *     createdAt: integer("created_at", { mode: "timestamp" })
 *       .notNull()
 *       .$defaultFn(() => new Date()),
 *   });
 */

// Add your table definitions here
export {};
