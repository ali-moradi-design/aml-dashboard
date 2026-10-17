import { z } from "zod";
import { meSchema, sessionInfoSchema, type LoginInput } from "@aml/shared";
import { del, post, request } from "@/shared/api";

const okSchema = z.object({ ok: z.boolean() });

export const login = (input: LoginInput) => post("/auth/login", meSchema, input);
export const logout = () => post("/auth/logout", okSchema, {});
export const getMe = () => request("/auth/me", meSchema);
export const getSessions = () => request("/auth/sessions", z.array(sessionInfoSchema));
export const revokeSession = (id: string) => del(`/auth/sessions/${id}`, okSchema);
export const revokeOtherSessions = () => del("/auth/sessions/others", z.object({ revoked: z.number() }));
