import * as schema from "./db-schema";

export type Database = any;

export function getDb(d1: any): Database {
  return schema;
}
