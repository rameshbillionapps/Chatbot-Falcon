import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });

pool.query("CREATE EXTENSION IF NOT EXISTS vector").catch((err) => {
  console.error("Failed to enable pgvector extension:", err);
});
