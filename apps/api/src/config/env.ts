import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  STORAGE_DIR: z.string().default("storage"),
  // Public demo: rebuild all data on this cron schedule (for example "0 3 * * *"). Empty = off.
  DEMO_RESET_CRON: z.string().trim().default(""),
  DEMO_RESET_TZ: z.string().default("UTC"),
  // Number of reverse proxies in front of the API (Nginx = 1), so req.ip is the visitor's
  // address for the per-IP upload limit. 0 = no proxy (development).
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
});

export type Env = z.infer<typeof envSchema>;

/** Reads and validates environment variables once at startup; fails fast with a clear message. */
export const loadEnv = (source: NodeJS.ProcessEnv = process.env): Env => {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Invalid environment:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
};
