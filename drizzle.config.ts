import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  // Don't throw here to avoid breaking builds that don't need the DB
  console.warn("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgres://dummy:dummy@localhost:5432/dummy",
  },
});
