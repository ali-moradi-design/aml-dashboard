import { Router, type RequestHandler } from "express";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import {
  importCustomerRowSchema, importTransactionRowSchema, importValidateSchema,
  type ImportBatch, type ImportKind, type ImportValidate,
} from "@aml/shared";
import type { Db } from "../../db/prisma";
import { Prisma } from "../../generated/prisma/client";
import { principalOf, type Principal } from "../../shared/access";
import { appError } from "../../shared/errors";
import { handle } from "../../shared/http";
import { parseWith } from "../../shared/validate";
import { requirePermission } from "../auth";
import type { Notifications } from "../notifications";

const dbError = (cause: unknown) => appError.unexpected("Database error", cause);
const FX_TO_EUR: Record<string, number> = { EUR: 1, USD: 0.92, TRY: 0.027, AED: 0.25 };
const MAX_ISSUES = 300;

export type Issue = { row: number; field: string; message: string };
type Lookup = {
  /** Branch code -> id, only branches in the user's regions. */
  branches: Map<string, string>;
  takenEmails: Set<string>;
  /** IBAN -> account in the user's scope. */
  accounts: Map<string, { id: string; branchId: string }>;
};

/** Pure: file columns to target fields, using the mapping chosen in the wizard. */
export const applyMapping = (rows: Array<Record<string, unknown>>, mapping: Record<string, string>) =>
  rows.map((row) => Object.fromEntries(Object.entries(mapping).filter(([, header]) => header).map(([field, header]) => [field, typeof row[header] === "string" ? (row[header] as string).trim() : row[header]])));

/**
 * Pure: checks every mapped row with the shared Zod schema plus what only the database knows
 * (branch in the user's regions, email not taken, account exists). Row numbers match the file
 * (row 1 is the header).
 */
export const validateRows = (kind: ImportKind, rows: Array<Record<string, unknown>>, lookup: Lookup) => {
  const issues: Issue[] = [];
  const valid: Array<{ row: number; data: Record<string, unknown> }> = [];
  const seenEmails = new Set<string>();
  rows.forEach((raw, i) => {
    const row = i + 2;
    const before = issues.length;
    const schema = kind === "customers" ? importCustomerRowSchema : importTransactionRowSchema;
    const parsed = schema.safeParse(Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v === "" ? undefined : v])));
    if (!parsed.success) {
      for (const issue of parsed.error.issues) issues.push({ row, field: String(issue.path[0] ?? ""), message: issue.message.startsWith("errors.") ? issue.message : "errors.invalid" });
    } else if (kind === "customers") {
      const d = parsed.data as { branchCode: string; email?: string };
      if (!lookup.branches.has(d.branchCode.toUpperCase())) issues.push({ row, field: "branchCode", message: "errors.branchRegion" });
      const email = d.email?.toLowerCase();
      if (email && (lookup.takenEmails.has(email) || seenEmails.has(email))) issues.push({ row, field: "email", message: "errors.emailTaken" });
      if (email) seenEmails.add(email);
    } else {
      const d = parsed.data as { iban: string };
      if (!lookup.accounts.has(d.iban.replace(/\s+/g, "").toUpperCase())) issues.push({ row, field: "iban", message: "errors.unknownAccount" });
    }
    if (issues.length === before && parsed.success) valid.push({ row, data: parsed.data as Record<string, unknown> });
  });
  const errorRows = new Set(issues.map((x) => x.row)).size;
  return { valid, issues, errorRows };
};

export const createImportsModule = ({ db, requireAuth, notifications }: { db: Db; requireAuth: RequestHandler; notifications: Notifications }) => {
  const lookup = async (p: Principal, kind: ImportKind, rows: Array<Record<string, unknown>>): Promise<Lookup> => {
    const branches = new Map((await db.branch.findMany({ where: { regionId: { in: p.regionIds } }, select: { id: true, code: true } })).map((b) => [b.code, b.id]));
    if (kind === "customers") {
      const emails = rows.map((r) => String(r.email ?? "").toLowerCase()).filter(Boolean);
      const taken = await db.customer.findMany({ where: { email: { in: emails } }, select: { email: true } });
      return { branches, takenEmails: new Set(taken.map((c) => c.email!.toLowerCase())), accounts: new Map() };
    }
    const ibans = rows.map((r) => String(r.iban ?? "").replace(/\s+/g, "").toUpperCase()).filter(Boolean);
    const accounts = await db.account.findMany({
      where: { iban: { in: ibans }, branch: { regionId: { in: p.regionIds } }, customer: { clearanceRank: { lte: p.clearanceRank } } },
      select: { id: true, iban: true, branchId: true },
    });
    return { branches, takenEmails: new Set(), accounts: new Map(accounts.map((a) => [a.iban, { id: a.id, branchId: a.branchId }])) };
  };

  const toBatch = (b: { id: string; kind: string; fileName: string; status: ImportBatch["status"]; totalRows: number; validRows: number; errorRows: number; errors: unknown; createdBy: { name: string }; createdAt: Date; importedAt: Date | null }): ImportBatch => ({
    id: b.id, kind: b.kind as ImportKind, fileName: b.fileName, status: b.status, totalRows: b.totalRows, validRows: b.validRows, errorRows: b.errorRows,
    errors: b.errors as Issue[], createdByName: b.createdBy.name, createdAt: b.createdAt.toISOString(), importedAt: b.importedAt?.toISOString() ?? null,
  });

  const validate = (p: Principal, input: ImportValidate) =>
    ResultAsync.fromPromise(
      (async () => {
        const mapped = applyMapping(input.rows, input.mapping);
        const result = validateRows(input.kind, mapped, await lookup(p, input.kind, mapped));
        const batch = await db.importBatch.create({
          data: {
            kind: input.kind, fileName: input.fileName, mapping: input.mapping, rows: result.valid as unknown as Prisma.InputJsonValue,
            totalRows: mapped.length, validRows: result.valid.length, errorRows: result.errorRows, errors: result.issues.slice(0, MAX_ISSUES), createdById: p.userId,
          },
          include: { createdBy: { select: { name: true } } },
        });
        return toBatch(batch);
      })(),
      dbError,
    );

  const commit = (p: Principal, id: string) =>
    ResultAsync.fromPromise(db.importBatch.findUnique({ where: { id }, include: { createdBy: { select: { name: true } } } }), dbError)
      .andThen((b) => (!b ? errAsync(appError.notFound("Import not found")) : b.status !== "VALIDATED" ? errAsync(appError.conflict("This import was already handled")) : okAsync(b)))
      .andThen((b) =>
        ResultAsync.fromPromise(
          (async () => {
            const rows = (b.rows as Array<{ row: number; data: Record<string, unknown> }>).map((r) => r.data);
            const look = await lookup(p, b.kind as ImportKind, rows);
            await db.$transaction(async (tx) => {
              if (b.kind === "customers") {
                const last = await tx.customer.findFirst({ orderBy: { code: "desc" }, select: { code: true } });
                let n = Number(last?.code.replace("CU-", "") ?? 10000);
                await tx.customer.createMany({
                  data: rows.map((r) => ({
                    code: `CU-${++n}`, type: r.type as "PERSON" | "COMPANY", name: String(r.name), country: String(r.country), email: r.email ? String(r.email).toLowerCase() : null,
                    phone: r.phone ? String(r.phone) : null, riskScore: Number(r.riskScore ?? 20), kycStatus: "PENDING" as const, branchId: look.branches.get(String(r.branchCode).toUpperCase())!,
                  })),
                });
              } else {
                const last = await tx.transaction.findFirst({ orderBy: { ref: "desc" }, select: { ref: true } });
                let n = Number(last?.ref.replace("TX-", "") ?? 0);
                await tx.transaction.createMany({
                  data: rows.map((r) => {
                    const acc = look.accounts.get(String(r.iban).replace(/\s+/g, "").toUpperCase())!;
                    const amount = Number(r.amount);
                    return {
                      ref: `TX-${String(++n).padStart(8, "0")}`, accountId: acc.id, branchId: acc.branchId, direction: r.direction as "IN" | "OUT", channel: r.channel as never,
                      amount: new Prisma.Decimal(amount.toFixed(2)), currency: String(r.currency), baseAmount: new Prisma.Decimal((amount * (FX_TO_EUR[String(r.currency)] ?? 1)).toFixed(2)),
                      counterpartyName: String(r.counterpartyName), counterpartyIban: r.counterpartyIban ? String(r.counterpartyIban) : null, counterpartyCountry: String(r.counterpartyCountry).toUpperCase(),
                      bookedAt: new Date(String(r.bookedAt)),
                    };
                  }),
                });
              }
              await tx.importBatch.update({ where: { id: b.id }, data: { status: "IMPORTED", importedAt: new Date(), rows: [] } });
              await tx.auditLog.create({ data: { userId: p.userId, action: "import.commit", entity: "import", entityId: b.id, data: { kind: b.kind, rows: rows.length } } });
            });
            await notifications.push([p.userId], "import_done", { file: b.fileName, count: rows.length });
            return { id: b.id, imported: rows.length };
          })(),
          dbError,
        ),
      );

  return Router()
    .use(requireAuth, requirePermission("import.manage"))
    .get("/", handle(() =>
      ResultAsync.fromPromise(db.importBatch.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { createdBy: { select: { name: true } } } }), dbError).map((bs) => bs.map(toBatch)),
    ))
    .post("/validate", handle((req, res) => parseWith(importValidateSchema, req.body).asyncAndThen((i) => validate(principalOf(res), i)), 201))
    .post("/:id/commit", handle((req, res) => commit(principalOf(res), String(req.params.id))))
    .post("/:id/discard", handle((req) =>
      ResultAsync.fromPromise(db.importBatch.updateMany({ where: { id: String(req.params.id), status: "VALIDATED" }, data: { status: "DISCARDED", rows: [] } }), dbError).map((r) => ({ ok: r.count > 0 })),
    ));
};
