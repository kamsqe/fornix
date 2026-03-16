import { getDb } from "./db";

type D1Database = any;

export function createAuth(d1: D1Database) {
  const db = getDb(d1);
  return { handler: (req: Request) => new Response("auth") };
}
