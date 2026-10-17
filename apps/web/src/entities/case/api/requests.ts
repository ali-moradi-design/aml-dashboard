import { z } from "zod";
import {
  caseBoardSchema, caseDetailSchema, casePageSchema, caseStatuses, commentSchema, userRefSchema,
  type CaseCreate, type CaseTransition, type CaseUpdate, type CommentInput, type GridQuery,
} from "@aml/shared";
import { del, post, request } from "@/shared/api";
import { API_URL } from "@/shared/config/env";

const codeSchema = z.object({ code: z.string() });
const okSchema = z.object({ ok: z.boolean() });
const noteSchema = z.object({ body: z.string(), updatedAt: z.string().nullable() });

export const queryCases = (q: GridQuery) => post("/cases/query", casePageSchema, q);
export const getCaseBoard = (filters: GridQuery["filters"]) => post("/cases/board", caseBoardSchema, { filters });
export const getCase = (code: string) => request(`/cases/${code}`, caseDetailSchema);
export const createCase = (input: CaseCreate) => post("/cases", codeSchema, input);
export const updateCase = ({ code, ...input }: CaseUpdate & { code: string }) => request(`/cases/${code}`, codeSchema, { method: "PATCH", body: JSON.stringify(input) });
export const transitionCase = ({ code, ...input }: CaseTransition & { code: string }) =>
  post(`/cases/${code}/transition`, z.object({ code: z.string(), status: z.enum(caseStatuses) }), input);
export const getEligibleMembers = (code: string) => request(`/cases/${code}/eligible-members`, z.array(userRefSchema));
export const addCaseMember = ({ code, userId }: { code: string; userId: string }) => post(`/cases/${code}/members`, okSchema, { userId });
export const removeCaseMember = ({ code, userId }: { code: string; userId: string }) => del(`/cases/${code}/members/${userId}`, okSchema);
export const getComments = (code: string) => request(`/cases/${code}/comments`, z.array(commentSchema));
export const addComment = ({ code, ...input }: CommentInput & { code: string; documentIds?: string[] }) => post(`/cases/${code}/comments`, commentSchema, input);
export const editComment = ({ code, id, body }: { code: string; id: string; body: string }) => request(`/cases/${code}/comments/${id}`, commentSchema, { method: "PATCH", body: JSON.stringify({ body }) });
export const deleteComment = ({ code, id }: { code: string; id: string }) => del(`/cases/${code}/comments/${id}`, okSchema);
export const getNote = (code: string) => request(`/cases/${code}/note`, noteSchema);
export const saveNote = ({ code, body }: { code: string; body: string }) => request(`/cases/${code}/note`, noteSchema, { method: "PUT", body: JSON.stringify({ body }) });

/** Multipart upload (not JSON), so it uses fetch directly. */
export const uploadCaseDocument = async ({ code, file }: { code: string; file: File }) => {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch(`${API_URL}/cases/${code}/documents`, { method: "POST", body, credentials: "include" });
  const json = (await res.json().catch(() => ({}))) as { message?: string };
  if (!res.ok) throw { kind: "http", status: res.status, code: "UPLOAD", message: json.message ?? res.statusText };
  return z.object({ id: z.string(), name: z.string(), size: z.number() }).parse(json);
};

export const documentUrl = (code: string, id: string) => `${API_URL}/cases/${code}/documents/${id}`;
