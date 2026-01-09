import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL && process.env.NODE_ENV === 'production') {
  throw new Error("DATABASE_URL is missing in production environment");
}

// We allow DATABASE_URL to be undefined for MemStorage usage
const connectionString = process.env.DATABASE_URL || "postgres://dummy:dummy@localhost:5432/dummy";

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });
