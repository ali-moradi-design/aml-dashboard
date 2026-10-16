import { defineConfig } from "prisma/config";

// Load apps/api/.env when it exists (Node's built-in loader, no dotenv needed).
try {
  process.loadEnvFile();
} catch {
  // No .env file: rely on real environment variables (Docker, CI).
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
