import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import path from "path";
import { defineConfig, env } from "prisma/config";

// Load .env.local explicitly for Next.js consistency.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, ".env.local"), override: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DIRECT_URL") || env("DATABASE_URL"),
  },
});
