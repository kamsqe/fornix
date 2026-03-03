/**
 * Database client — Drizzle ORM with Cloudflare D1.
 *
 * Usage in Astro pages/endpoints:
 *   import { getDb } from "../lib/db";
 *   const db = getDb(Astro.locals.runtime.env.DB);
 */

import { drizzle } from "drizzle-orm/d1";
import * as schema from "./db-schema";

export type Database = ReturnType<typeof drizzle>;

/**
 * Create a Drizzle ORM instance from a D1 binding.
 * Call this in your Astro endpoints or middleware with the D1 binding
 * from the Cloudflare runtime environment.
 */
export function getDb(d1: D1Database): Database {
  return drizzle(d1, { schema });
}
