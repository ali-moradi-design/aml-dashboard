import type { ZodType } from "zod";
import { API_URL } from "@/shared/config/env";

export type HttpError = {
  kind: "http";
  status: number;
  code: string;
  message: string;
};

export const isHttpError = (value: unknown): value is HttpError =>
  typeof value === "object" && value !== null && (value as HttpError).kind === "http";

const toHttpError = async (res: Response): Promise<HttpError> => {
  const body = (await res.json().catch(() => ({}))) as { code?: string; message?: string };
  return {
    kind: "http",
    status: res.status,
    code: body.code ?? "UNKNOWN",
    message: body.message ?? res.statusText,
  };
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
