import { ResultAsync } from "neverthrow";
import type { Db } from "../../db/prisma";
import type { AccessScope } from "../../shared/access";
import { appError } from "../../shared/errors";

const dbError = (cause: unknown) => appError.unexpected("Database error", cause);

export type Range = { from: Date; to: Date; minAmount: number };
export type TransferRow = {
  source: string;
  target: string;
  amount: number;
  count: bigint;
  last_at: Date;
};
export type ExternalRow = {
  account_id: string;
  iban: string;
  name: string;
  country: string;
  out_amount: number;
  in_amount: number;
  count: bigint;
  last_at: Date;
  rank: bigint;
};

/** Hard cap on the accounts one walk may return; the UI asks the user to narrow the filters. */
export const NODE_LIMIT = 250;

export const createNetworkRepository = (db: Db) => ({
  /** Accounts the user may start from: a customer's accounts, or one account, inside their scope. */
  startAccounts: (s: AccessScope, center: string) =>
    ResultAsync.fromPromise(
      db.account.findMany({
        where: {
          ...(center.startsWith("CU-") ? {} : { id: center }),
          branch: { regionId: { in: s.regionIds } },
          customer: {
            clearanceRank: { lte: s.clearanceRank },
            ...(center.startsWith("CU-") ? { code: center } : {}),
          },
        },
        select: { id: true },
      }),
      dbError,
    ),

  /**
   * Breadth-first walk over transfers between accounts at this bank (`WITH RECURSIVE`). It only
   * expands from accounts inside the user's regions and clearance, so a restricted account can
   * appear at the edge of the graph but never leads further.
   */
  walk: (s: AccessScope, start: string[], hops: number, r: Range) =>
    ResultAsync.fromPromise(
      db.$queryRaw<Array<{ id: string; depth: number }>>`
        WITH RECURSIVE walk(id, depth) AS (
          SELECT unnest(${start}::text[]), 0
          UNION
          SELECT DISTINCT t."counterpartyAccountId", w.depth + 1
          FROM walk w
          JOIN "Account" a ON a.id = w.id
          JOIN "Branch" b ON b.id = a."branchId"
          JOIN "Customer" c ON c.id = a."customerId"
          JOIN "Transaction" t ON t."accountId" = w.id
          WHERE w.depth < ${hops}
            AND b."regionId" = ANY(${s.regionIds}) AND c."clearanceRank" <= ${s.clearanceRank}
            AND t."counterpartyAccountId" IS NOT NULL
            AND t."bookedAt" >= ${r.from} AND t."bookedAt" < ${r.to} AND t."baseAmount" >= ${r.minAmount}
        )
        SELECT id, min(depth)::int AS depth FROM walk GROUP BY id ORDER BY min(depth), id LIMIT ${NODE_LIMIT + 1}`,
      dbError,
    ),

  accounts: (ids: string[]) =>
    ResultAsync.fromPromise(
      db.account.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          iban: true,
          currency: true,
          status: true,
          branch: { select: { regionId: true } },
          customer: {
            select: {
              id: true,
              code: true,
              name: true,
              type: true,
              country: true,
              riskScore: true,
              pep: true,
              clearanceRank: true,
              shareholders: {
                select: { id: true, name: true, type: true, country: true, sharePercent: true },
              },
            },
          },
          _count: { select: { alerts: { where: { status: { in: ["NEW", "IN_REVIEW"] } } } } },
        },
      }),
      dbError,
    ),

  /** Money between the walked accounts, one edge per direction (the OUT leg of each transfer). */
  transfers: (ids: string[], r: Range) =>
    ResultAsync.fromPromise(
      db.$queryRaw<TransferRow[]>`
        SELECT t."accountId" AS source, t."counterpartyAccountId" AS target, sum(t."baseAmount")::float8 AS amount, count(*) AS count, max(t."bookedAt") AS last_at
        FROM "Transaction" t
        WHERE t.direction = 'OUT' AND t."accountId" = ANY(${ids}) AND t."counterpartyAccountId" = ANY(${ids})
          AND t."bookedAt" >= ${r.from} AND t."bookedAt" < ${r.to} AND t."baseAmount" >= ${r.minAmount}
        GROUP BY 1, 2`,
      dbError,
    ),

  /** Biggest counterparties at other banks, ranked per account (the service keeps the top few). */
  externals: (ids: string[], r: Range) =>
    ResultAsync.fromPromise(
      db.$queryRaw<ExternalRow[]>`
        SELECT * FROM (
          SELECT t."accountId" AS account_id, t."counterpartyIban" AS iban, max(t."counterpartyName") AS name, max(t."counterpartyCountry") AS country,
            (sum(t."baseAmount") FILTER (WHERE t.direction = 'OUT'))::float8 AS out_amount,
            (sum(t."baseAmount") FILTER (WHERE t.direction = 'IN'))::float8 AS in_amount,
            count(*) AS count, max(t."bookedAt") AS last_at,
            row_number() OVER (PARTITION BY t."accountId" ORDER BY sum(t."baseAmount") DESC) AS rank
          FROM "Transaction" t
          WHERE t."accountId" = ANY(${ids}) AND t."counterpartyAccountId" IS NULL AND t."counterpartyIban" IS NOT NULL AND t.channel = 'WIRE'
            AND t."bookedAt" >= ${r.from} AND t."bookedAt" < ${r.to} AND t."baseAmount" >= ${r.minAmount}
          GROUP BY t."accountId", t."counterpartyIban"
        ) x
        WHERE rank <= 4 OR country IN ('XA', 'XB', 'XC')`,
      dbError,
    ),

  /**
   * Shortest chain of transfers between two accounts (up to 5 hops, either direction), walking only
   * through accounts the user may see. Both legs of each transfer are booked, so following
   * accountId -> counterpartyAccountId covers both directions.
   */
  path: (s: AccessScope, from: string, to: string, r: Range) =>
    ResultAsync.fromPromise(
      db.$queryRaw<Array<{ path: string[] }>>`
        WITH RECURSIVE allowed AS (
          SELECT a.id FROM "Account" a JOIN "Branch" b ON b.id = a."branchId" JOIN "Customer" c ON c.id = a."customerId"
          WHERE b."regionId" = ANY(${s.regionIds}) AND c."clearanceRank" <= ${s.clearanceRank}
        ),
        edges AS (
          SELECT DISTINCT t."accountId" AS a, t."counterpartyAccountId" AS b
          FROM "Transaction" t JOIN allowed x ON x.id = t."accountId" JOIN allowed y ON y.id = t."counterpartyAccountId"
          WHERE t."bookedAt" >= ${r.from} AND t."bookedAt" < ${r.to} AND t."baseAmount" >= ${r.minAmount}
        ),
        bfs(id, path) AS (
          SELECT ${from}::text, ARRAY[${from}::text]
          UNION ALL
          SELECT e.b, bfs.path || e.b FROM bfs JOIN edges e ON e.a = bfs.id
          WHERE cardinality(bfs.path) <= 5 AND NOT e.b = ANY(bfs.path) AND NOT ${to}::text = ANY(bfs.path)
        )
        SELECT path FROM bfs WHERE id = ${to} ORDER BY cardinality(path) LIMIT 1`,
      dbError,
    ),

  /** A good first picture: the in-scope customer with the most counterparts at this bank. */
  featured: (s: AccessScope) =>
    ResultAsync.fromPromise(
      db.$queryRaw<Array<{ code: string }>>`
        SELECT c.code FROM "Transaction" t
        JOIN "Account" a ON a.id = t."accountId" JOIN "Customer" c ON c.id = a."customerId" JOIN "Branch" b ON b.id = a."branchId"
        WHERE t."counterpartyAccountId" IS NOT NULL AND t."bookedAt" >= now() - interval '180 days'
          AND b."regionId" = ANY(${s.regionIds}) AND c."clearanceRank" <= ${s.clearanceRank}
          AND EXISTS (SELECT 1 FROM "Alert" al WHERE al."accountId" = a.id AND al."ruleId" IN (SELECT id FROM "Rule" WHERE code = 'R-RAPID'))
        GROUP BY c.code ORDER BY count(DISTINCT t."counterpartyAccountId") DESC LIMIT 1`,
      dbError,
    ),
});

export type NetworkRepository = ReturnType<typeof createNetworkRepository>;
