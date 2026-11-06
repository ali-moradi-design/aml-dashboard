import { cookies } from "next/headers";
import type { ZodType } from "zod";
import { API_URL } from "@/shared/config/env";

// Server components only (reads the request cookies). Inside Docker the web container reaches the
// API directly (API_INTERNAL_URL, e.g. http://api:4000) instead of going back out through Nginx.
const SERVER_API_URL = process.env.API_INTERNAL_URL ?? API_URL;
const SESSION_COOKIE = "aml_session";

/**
 * GET on the API with the visitor's session cookie, for prefetching during server rendering.
 * Returns null on any failure (no session, 401, timeout, bad data): the browser then loads the
 * same query itself, so a failed prefetch only costs the time it took.
 */
export const serverRequest = async <T>(path: string, schema: ZodType<T>): Promise<T | null> => {
  const session = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!session) return null;
  try {
    const res = await fetch(`${SERVER_API_URL}${path}`, {
      headers: { cookie: `${SESSION_COOKIE}=${encodeURIComponent(session)}` },
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const parsed = schema.safeParse(await res.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};
