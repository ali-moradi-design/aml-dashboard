import { errAsync, okAsync, ResultAsync } from "neverthrow";
import {
  highRiskCountries,
  type NetworkEdge,
  type NetworkGraph,
  type NetworkNode,
  type NetworkQuery,
} from "@aml/shared";
import { scopeOf, type AccessScope, type Principal } from "../../shared/access";
import { appError } from "../../shared/errors";
import {
  NODE_LIMIT,
  type ExternalRow,
  type NetworkRepository,
  type Range,
  type TransferRow,
} from "./network.repository";

type AccountSource = {
  id: string;
  iban: string;
  currency: string;
  status: string;
  branch: { regionId: string };
  customer: {
    id: string;
    code: string;
    name: string;
    type: "PERSON" | "COMPANY";
    country: string;
    riskScore: number;
    pep: boolean;
    clearanceRank: number;
    shareholders: Array<{
      id: string;
      name: string;
      type: "PERSON" | "COMPANY";
      country: string;
      sharePercent: { toNumber?: () => number } | number | string;
    }>;
  };
  _count: { alerts: number };
};

export const maskIban = (iban: string) => `${iban.slice(0, 4)} •••• ${iban.slice(-4)}`;

/** Inclusive date range from the query (dates are days; the end day counts fully). */
export const rangeOf = (q: Pick<NetworkQuery, "from" | "to" | "minAmount">): Range => {
  const to = new Date(`${q.to}T00:00:00Z`);
  to.setUTCDate(to.getUTCDate() + 1);
  return { from: new Date(`${q.from}T00:00:00Z`), to, minAmount: q.minAmount };
};

/**
 * Pure: database rows to graph nodes and edges. Accounts outside the user's scope are masked
 * (no owner, no amounts beyond the transfer itself) and get no further neighbors.
 */
export const buildNetwork = (input: {
  scope: AccessScope;
  center: string | null;
  walked: Array<{ id: string; depth: number }>;
  accounts: AccountSource[];
  transfers: TransferRow[];
  externals: ExternalRow[];
  truncated: boolean;
}): NetworkGraph => {
  const { scope } = input;
  const nodes = new Map<string, NetworkNode>();
  const edges: NetworkEdge[] = [];
  const depth = new Map(input.walked.map((w) => [w.id, w.depth]));
  const visible = (a: AccountSource) =>
    scope.regionIds.includes(a.branch.regionId) && a.customer.clearanceRank <= scope.clearanceRank;
  const open = new Set<string>();

  for (const a of input.accounts) {
    const d = depth.get(a.id) ?? 0;
    if (!visible(a)) {
      nodes.set(a.id, {
        kind: "account",
        id: a.id,
        iban: maskIban(a.iban),
        currency: a.currency,
        status: a.status,
        depth: d,
        restricted: true,
        ownerCode: null,
        riskScore: null,
        openAlerts: 0,
      });
      continue;
    }
    open.add(a.id);
    const c = a.customer;
    nodes.set(a.id, {
      kind: "account",
      id: a.id,
      iban: a.iban,
      currency: a.currency,
      status: a.status,
      depth: d,
      restricted: false,
      ownerCode: c.code,
      riskScore: c.riskScore,
      openAlerts: a._count.alerts,
    });
    const cid = `c:${c.id}`;
    const prev = nodes.get(cid);
    nodes.set(cid, {
      kind: "customer",
      id: cid,
      code: c.code,
      name: c.name,
      type: c.type,
      country: c.country,
      riskScore: c.riskScore,
      pep: c.pep,
      openAlerts: (prev?.kind === "customer" ? prev.openAlerts : 0) + a._count.alerts,
    });
    edges.push({
      id: `o:${cid}>${a.id}`,
      source: cid,
      target: a.id,
      kind: "owns",
      amount: 100,
      count: 1,
      lastAt: null,
    });
    // Shareholders of companies near the center (ownership is part of the picture, not only money).
    if (c.type === "COMPANY" && d <= 1 && !prev) {
      for (const s of c.shareholders) {
        const sid = `s:${s.id}`;
        nodes.set(sid, {
          kind: "shareholder",
          id: sid,
          name: s.name,
          type: s.type,
          country: s.country,
        });
        edges.push({
          id: `o:${sid}>${cid}`,
          source: sid,
          target: cid,
          kind: "owns",
          amount: Number(s.sharePercent),
          count: 1,
          lastAt: null,
        });
      }
    }
  }

  for (const t of input.transfers) {
    if (
      !nodes.has(t.source) ||
      !nodes.has(t.target) ||
      (!open.has(t.source) && !open.has(t.target))
    )
      continue;
    edges.push({
      id: `t:${t.source}>${t.target}`,
      source: t.source,
      target: t.target,
      kind: "transfer",
      amount: Math.round(t.amount),
      count: Number(t.count),
      lastAt: t.last_at.toISOString(),
    });
  }

  for (const x of input.externals) {
    const d = depth.get(x.account_id);
    if (d === undefined || !open.has(x.account_id)) continue;
    const highRisk = highRiskCountries.includes(x.country);
    if (!highRisk && Number(x.rank) > (d === 0 ? 4 : d === 1 ? 2 : 0)) continue;
    const xid = `x:${x.iban}`;
    nodes.set(xid, {
      kind: "external",
      id: xid,
      iban: x.iban,
      name: x.name,
      country: x.country,
      highRisk,
    });
    const out = x.out_amount ?? 0;
    const inn = x.in_amount ?? 0;
    const [source, target] = out >= inn ? [x.account_id, xid] : [xid, x.account_id];
    edges.push({
      id: `t:${source}>${target}`,
      source,
      target,
      kind: "transfer",
      amount: Math.round(out + inn),
      count: Number(x.count),
      lastAt: x.last_at.toISOString(),
    });
  }

  return { center: input.center, nodes: [...nodes.values()], edges, truncated: input.truncated };
};

export const createNetworkService = ({ repo }: { repo: NetworkRepository }) => {
  const assemble = (
    scope: AccessScope,
    center: string | null,
    walked: Array<{ id: string; depth: number }>,
    r: Range,
    truncated: boolean,
    withExternals = true,
  ) => {
    const ids = walked.map((w) => w.id);
    return ResultAsync.combine([
      repo.accounts(ids),
      repo.transfers(ids, r),
      withExternals ? repo.externals(ids, r) : okAsync<ExternalRow[]>([]),
    ] as const).map(([accounts, transfers, externals]) =>
      buildNetwork({
        scope,
        center,
        walked,
        accounts: accounts as AccountSource[],
        transfers,
        externals,
        truncated,
      }),
    );
  };

  return {
    graph: (p: Principal, q: NetworkQuery) => {
      const scope = scopeOf(p);
      const r = rangeOf(q);
      return repo
        .startAccounts(scope, q.center)
        .andThen((start) =>
          start.length
            ? okAsync(start.map((a) => a.id))
            : errAsync(appError.notFound("Nothing to show for this customer or account")),
        )
        .andThen((start) => repo.walk(scope, start, q.hops, r).map((rows) => ({ start, rows })))
        .andThen(({ start, rows }) =>
          assemble(scope, null, rows.slice(0, NODE_LIMIT), r, rows.length > NODE_LIMIT).map(
            (g) => ({
              ...g,
              center: q.center.startsWith("CU-")
                ? (g.nodes.find((n) => n.kind === "customer" && n.code === q.center)?.id ?? null)
                : start[0]!,
            }),
          ),
        );
    },

    path: (
      p: Principal,
      q: Pick<NetworkQuery, "from" | "to" | "minAmount"> & { source: string; target: string },
    ) => {
      const scope = scopeOf(p);
      const r = rangeOf(q);
      return repo.path(scope, q.source, q.target, r).andThen((rows) => {
        const path = rows[0]?.path ?? [];
        if (!path.length)
          return okAsync({
            path,
            graph: { center: null, nodes: [], edges: [], truncated: false } satisfies NetworkGraph,
          });
        return assemble(
          scope,
          null,
          path.map((id, depth) => ({ id, depth })),
          r,
          false,
          false,
        ).map((graph) => ({ path, graph }));
      });
    },

    featured: (p: Principal) =>
      repo.featured(scopeOf(p)).map((rows) => ({ code: rows[0]?.code ?? null })),
  };
};
