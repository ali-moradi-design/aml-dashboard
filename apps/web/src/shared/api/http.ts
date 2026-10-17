import type { ZodType } from "zod";
import { API_URL } from "@/shared/config/env";

export type HttpError = {
  kind: "http";
  status: number;
  code: string;
  message: string;
  issues?: unknown;
};

export const isHttpError = (value: unknown): value is HttpError =>
  typeof value === "object" && value !== null && (value as HttpError).kind === "http";

const toHttpError = async (res: Response): Promise<HttpError> => {
  const body = (await res.json().catch(() => ({}))) as { code?: string; message?: string; issues?: unknown };
  return { kind: "http", status: res.status, code: body.code ?? "UNKNOWN", message: body.message ?? res.statusText, issues: body.issues };
};

/**
 * Calls the API and validates the response with the shared Zod schema.
 * Rejects with an HttpError, which React Query exposes as `error`.
 */
export const request = async <T>(path: string, schema: ZodType<T>, init: RequestInit = {}): Promise<T> => {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  if (!res.ok) throw await toHttpError(res);
  return schema.parse(await res.json());
};

export const post = <T>(path: string, schema: ZodType<T>, body: unknown) => request(path, schema, { method: "POST", body: JSON.stringify(body) });
export const del = <T>(path: string, schema: ZodType<T>) => request(path, schema, { method: "DELETE" });
