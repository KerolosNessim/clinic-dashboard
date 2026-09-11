import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Prisma CLI (generate / db push / migrate) uses the direct, non-pooled
    // connection — Supabase's transaction-mode pooler doesn't support the
    // advisory locks and prepared statements migrations rely on.
    url: env("DIRECT_URL"),
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
