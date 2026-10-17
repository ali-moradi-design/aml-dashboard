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

/** Multipart upload (one file); the API answers with JSON validated by the schema. */
export const upload = async <T>(path: string, schema: ZodType<T>, file: Blob, fileName?: string): Promise<T> => {
  const body = new FormData();
  body.append("file", file, fileName ?? (file instanceof File ? file.name : "upload"));
  const res = await fetch(`${API_URL}${path}`, { method: "POST", body, credentials: "include" });
  if (!res.ok) throw await toHttpError(res);
  return schema.parse(await res.json());
};

/** Absolute URL for a file served by the API (covers, avatars, attachments). */
export const apiUrl = (path: string) => `${API_URL}${path}`;

/** Downloads a file the API generates (e.g. an Excel export) with the session cookie. */
export const download = async (path: string, fileName: string) => {
  const res = await fetch(`${API_URL}${path}`, { credentials: "include" });
  if (!res.ok) throw await toHttpError(res);
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement("a"), { href: url, download: fileName });
  a.click();
  URL.revokeObjectURL(url);
};
