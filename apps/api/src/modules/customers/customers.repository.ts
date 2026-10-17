import { ResultAsync } from "neverthrow";
import type { CustomerOnboarding, GridQuery, KycUpdate } from "@aml/shared";
import type { Db } from "../../db/prisma";
import { Prisma } from "../../generated/prisma/client";
import type { AccessScope } from "../../shared/access";
import { appError } from "../../shared/errors";
import { alertRowInclude, listFilter, transactionRowInclude } from "../../shared/mappers";
import { alertScope, customerScope } from "../../shared/scope";

const dbError = (cause: unknown) => appError.unexpected("Database error", cause);

const sortable: Record<string, (d: Prisma.SortOrder) => Prisma.CustomerOrderByWithRelationInput> = {
  code: (d) => ({ code: d }),
  name: (d) => ({ name: d }),
  riskScore: (d) => ({ riskScore: d }),
  country: (d) => ({ country: d }),
  createdAt: (d) => ({ createdAt: d }),
  kycStatus: (d) => ({ kycStatus: d }),
};

export const customerFilterWhere = (filters: GridQuery["filters"]): Prisma.CustomerWhereInput => {
  const type = listFilter(filters.type) as Array<"PERSON" | "COMPANY"> | undefined;
  const kyc = listFilter(filters.kycStatus) as Array<"PENDING" | "VERIFIED" | "EXPIRED" | "REJECTED"> | undefined;
  const search = typeof filters.search === "string" ? filters.search.trim() : "";
  return {
    ...(type ? { type: { in: type } } : {}),
    ...(kyc ? { kycStatus: { in: kyc } } : {}),
    ...(filters.pep === "true" ? { pep: true } : {}),
    ...(filters.highRisk === "true" ? { riskScore: { gte: 70 } } : {}),
    ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { code: { contains: search, mode: "insensitive" } }] } : {}),
  };
};

export const createCustomersRepository = (db: Db) => ({
  query: (s: AccessScope, q: GridQuery) => {
    const where: Prisma.CustomerWhereInput = { AND: [customerScope(s), customerFilterWhere(q.filters)] };
    const orderBy = q.sortModel.filter((x) => sortable[x.colId]).map((x) => sortable[x.colId]!(x.sort));
    return ResultAsync.fromPromise(
      db.$transaction([
        db.customer.findMany({
          where,
          include: { branch: { select: { city: true } }, _count: { select: { alerts: { where: { status: { in: ["NEW", "IN_REVIEW"] } } } } } },
          orderBy: orderBy.length ? [...orderBy, { id: "asc" }] : [{ riskScore: "desc" }, { id: "asc" }],
          skip: q.startRow,
          take: Math.min(q.endRow - q.startRow, 500),
        }),
        db.customer.count({ where }),
      ]),
      dbError,
    );
  },

  profile: (s: AccessScope, code: string) =>
    ResultAsync.fromPromise(
      db.customer.findFirst({
        where: { AND: [customerScope(s), { code }] },
        include: {
          branch: { select: { city: true, code: true } },
          accounts: { orderBy: { openedAt: "asc" } },
          shareholders: { include: { documents: true } },
          caseParties: { include: { case: { select: { code: true, title: true, status: true } } } },
          _count: { select: { alerts: { where: { status: { in: ["NEW", "IN_REVIEW"] } } } } },
        },
      }),
      dbError,
    ),

  recentTransactions: (customerId: string) =>
    ResultAsync.fromPromise(
      db.transaction.findMany({ where: { account: { customerId } }, include: transactionRowInclude, orderBy: { bookedAt: "desc" }, take: 25 }),
      dbError,
    ),

  monthly: (customerId: string) =>
    ResultAsync.fromPromise(
      db.$queryRaw<Array<{ month: Date; incoming: number; outgoing: number }>>`
        SELECT date_trunc('month', t."bookedAt") AS month,
          coalesce(sum(t."baseAmount") FILTER (WHERE t.direction = 'IN'), 0)::float AS incoming,
          coalesce(sum(t."baseAmount") FILTER (WHERE t.direction = 'OUT'), 0)::float AS outgoing
        FROM "Transaction" t JOIN "Account" a ON a.id = t."accountId"
        WHERE a."customerId" = ${customerId}
        GROUP BY 1 ORDER BY 1`,
      dbError,
    ),

  alerts: (s: AccessScope, customerId: string) =>
    ResultAsync.fromPromise(
      db.alert.findMany({ where: { AND: [alertScope(s), { customerId }] }, include: alertRowInclude, orderBy: { createdAt: "desc" }, take: 15 }),
      dbError,
    ),

  emailTaken: (email: string) =>
    ResultAsync.fromPromise(db.customer.count({ where: { email: email.toLowerCase() } }), dbError).map((n) => n > 0),

  ibanTaken: (iban: string) =>
    ResultAsync.fromPromise(db.account.count({ where: { iban: iban.replace(/\s+/g, "").toUpperCase() } }), dbError).map((n) => n > 0),

  branchByCode: (code: string) => ResultAsync.fromPromise(db.branch.findUnique({ where: { code } }), dbError),

  create: (input: CustomerOnboarding, branchId: string, userId: string) =>
    ResultAsync.fromPromise(
      db.$transaction(async (tx) => {
        const last = await tx.customer.findFirst({ orderBy: { code: "desc" }, select: { code: true } });
        const next = Number(last?.code.replace("CU-", "") ?? 10000) + 1;
        const person = input.type === "PERSON";
        const customer = await tx.customer.create({
          data: {
            code: `CU-${next}`,
            type: input.type,
            name: person ? `${input.firstName} ${input.lastName}` : input.companyName!,
            country: input.country,
            city: input.city,
            addressLine: input.addressLine,
            email: input.email.toLowerCase(),
            phone: input.phone,
            occupation: person ? input.occupation : null,
            employer: person ? input.employer || null : null,
            dateOfBirth: person && input.dateOfBirth ? new Date(input.dateOfBirth) : null,
            nationality: person ? input.nationality : null,
            registrationNumber: person ? null : input.registrationNumber,
            incorporationDate: !person && input.incorporationDate ? new Date(input.incorporationDate) : null,
            industry: person ? null : input.industry,
            sourceOfFunds: input.sourceOfFunds,
            expectedMonthlyVolume: new Prisma.Decimal(input.expectedMonthlyVolume),
            pep: input.pep,
            riskScore: input.pep ? 70 : 25,
            clearanceRank: input.pep ? 4 : 1,
            kycStatus: "PENDING",
            branchId,
            accounts: {
              create: input.accounts.map((a) => ({
                iban: a.iban.replace(/\s+/g, "").toUpperCase(),
                currency: a.currency,
                balance: new Prisma.Decimal(0),
                openedAt: new Date(),
                branchId,
              })),
            },
            shareholders: person
              ? undefined
              : {
                  create: input.shareholders.map((h) => ({
                    name: h.name,
                    type: h.type,
                    country: h.country,
                    sharePercent: new Prisma.Decimal(h.sharePercent),
                    documents: { create: h.documents.map((d) => ({ kind: d.kind, number: d.number, expiresAt: d.expiresAt ? new Date(d.expiresAt) : null })) },
                  })),
                },
          },
        });
        await tx.auditLog.create({ data: { userId, action: "customer.create", entity: "customer", entityId: customer.id } });
        return customer;
      }),
      dbError,
    ),

  updateKyc: (id: string, input: KycUpdate, userId: string) =>
    ResultAsync.fromPromise(
      db.$transaction(async (tx) => {
        const c = await tx.customer.update({
          where: { id },
          data: {
            occupation: input.occupation || null,
            employer: input.employer || null,
            sourceOfFunds: input.sourceOfFunds,
            expectedMonthlyVolume: new Prisma.Decimal(input.expectedMonthlyVolume),
            pep: input.pep,
            kycStatus: input.kycStatus,
            riskScore: input.riskScore,
            kycReviewedAt: new Date(),
            ...(input.pep ? { clearanceRank: 4 } : {}),
          },
        });
        await tx.auditLog.create({ data: { userId, action: "customer.kyc", entity: "customer", entityId: id, data: { kycStatus: input.kycStatus } } });
        return c;
      }),
      dbError,
    ),
});

export type CustomersRepository = ReturnType<typeof createCustomersRepository>;
