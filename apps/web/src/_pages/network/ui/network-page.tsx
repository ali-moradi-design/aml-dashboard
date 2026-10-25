"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleDot, Expand, Maximize2, Minus, Plus, Route, Search, X } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  formatIban,
  type NetworkEdge,
  type NetworkGraph,
  type NetworkNode,
  type NetworkQuery,
} from "@aml/shared";
import { customersQueryOptions } from "@/entities/customer";
import {
  networkQueryOptions,
  useFeaturedCustomer,
  useNetwork,
  useNetworkPath,
} from "@/entities/network";
import { detectClusters, mergeGraphs } from "../model/graph";
import type { CanvasHandle } from "./network-canvas";
import { useHref, useLocale } from "@/shared/i18n/use-locale";
import { formatCompact, formatMoney, formatNumber } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Note, PageHeader, Panel, PanelHeader } from "@/shared/ui/panel";
import { Segmented } from "@/shared/ui/segmented";
import { Skeleton } from "@/shared/ui/skeleton";

// WebGL needs the browser; the canvas is never rendered on the server.
const NetworkCanvas = dynamic(() => import("./network-canvas").then((m) => m.NetworkCanvas), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

const PERIODS = { "1m": 30, "3m": 90, "6m": 180, "12m": 365 } as const;
type Period = keyof typeof PERIODS;
const MIN_AMOUNTS = ["0", "1000", "10000", "50000"] as const;
const day = (d: Date) => d.toISOString().slice(0, 10);

/** Which query expands a node: accounts and customers can be expanded, others cannot. */
const expandCenter = (n: NetworkNode | undefined) =>
  n?.kind === "account" && !n.restricted ? n.id : n?.kind === "customer" ? n.code : null;

const CustomerSearch = ({ onPick }: { onPick: (code: string) => void }) => {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [term, setTerm] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setTerm(text.trim()), 300);
    return () => clearTimeout(id);
  }, [text]);
  const results = useQuery({
    ...customersQueryOptions({
      startRow: 0,
      endRow: 6,
      sortModel: [{ colId: "riskScore", sort: "desc" }],
      filters: { search: term },
    }),
    enabled: term.length >= 2,
  });
  return (
    <div className="relative">
      <label className="flex h-9 items-center gap-2 rounded-md border border-border bg-muted px-3 text-text-secondary focus-within:ring-2 focus-within:ring-ring">
        <Search className="size-4" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("network.searchCustomer")}
          aria-label={t("network.searchCustomer")}
          className="min-w-0 flex-1 bg-transparent text-text outline-none placeholder:text-text-secondary"
        />
      </label>
      {term.length >= 2 && results.data?.rows.length ? (
        <ul className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-md border border-border bg-card py-1 shadow-md">
          {results.data.rows.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(c.code);
                  setText("");
                }}
                className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-start text-sm hover:bg-muted"
              >
                <span className="truncate">{c.name}</span>
                <span className="font-mono text-xs text-text-secondary">{c.code}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

const Legend = () => {
  const { t } = useTranslation();
  const items: Array<[string, string]> = [
    ["bg-risk-high", t("network.legend.high")],
    ["bg-risk-medium", t("network.legend.medium")],
    ["bg-risk-low", t("network.legend.low")],
    ["bg-chart-4", t("network.legend.shareholder")],
    ["bg-border", t("network.legend.restricted")],
  ];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
      {items.map(([cls, label]) => (
        <li key={label} className="flex items-center gap-1.5">
          <span className={cn("size-2.5 rounded-full", cls)} />
          {label}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span className="h-0.5 w-5 rounded-full bg-chart-2" />
        {t("network.legend.transfer")}
      </li>
    </ul>
  );
};

export const NetworkPage = () => {
  const { t } = useTranslation();
  const locale = useLocale();
  const href = useHref();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const qc = useQueryClient();
  const canvas = useRef<CanvasHandle>(null);

  const [today] = useState(() => new Date());
  const [hops, setHops] = useState<"1" | "2" | "3">("2");
  const [period, setPeriod] = useState<Period>("6m");
  const [minAmount, setMinAmount] = useState<(typeof MIN_AMOUNTS)[number]>("0");
  const [colorBy, setColorBy] = useState<"risk" | "cluster">("risk");
  const [selected, setSelected] = useState<string | null>(null);
  const [cluster, setCluster] = useState<number | null>(null);
  const [pathEnds, setPathEnds] = useState<{ source: string | null; target: string | null }>({
    source: null,
    target: null,
  });
  const [expansions, setExpansions] = useState<{ key: string; graphs: NetworkGraph[] }>({
    key: "",
    graphs: [],
  });
  const [expanding, setExpanding] = useState(false);

  const paramCenter = params?.get("customer") ?? null;
  const featured = useFeaturedCustomer(!paramCenter);
  const center = paramCenter ?? featured.data?.code ?? null;
  const range = {
    from: day(new Date(today.getTime() - PERIODS[period] * 86_400_000)),
    to: day(today),
    minAmount: Number(minAmount),
  };
  const query: NetworkQuery | null = center ? { center, hops: Number(hops), ...range } : null;
  const baseKey = JSON.stringify(query);
  const base = useNetwork(query);
  const path = useNetworkPath(
    pathEnds.source && pathEnds.target
      ? { ...range, source: pathEnds.source, target: pathEnds.target }
      : null,
  );

  // New center or filters: start over (selection, expansions, path, cluster).
  const [lastKey, setLastKey] = useState(baseKey);
  if (lastKey !== baseKey) {
    setLastKey(baseKey);
    setSelected(null);
    setCluster(null);
    setPathEnds({ source: null, target: null });
  }

  const merged = useMemo(
    () =>
      mergeGraphs([
        ...(base.data ? [base.data] : []),
        ...(expansions.key === baseKey ? expansions.graphs : []),
        ...(path.data?.graph ? [path.data.graph] : []),
      ]),
    [base.data, expansions, baseKey, path.data],
  );
  const { communities, clusters } = useMemo(
    () => detectClusters(merged.nodes, merged.edges),
    [merged],
  );
  const byId = useMemo(() => new Map(merged.nodes.map((n) => [n.id, n])), [merged]);
  const pathSet = path.data?.path.length ? new Set(path.data.path) : null;
  const clusterSet =
    cluster !== null ? new Set(clusters.find((c) => c.id === cluster)?.nodes ?? []) : null;
  const highlight = pathSet ?? clusterSet;
  const node = selected ? byId.get(selected) : undefined;

  const transfers = merged.edges.filter((e) => e.kind === "transfer");
  const moved = transfers.reduce((s, e) => s + e.amount, 0);
  const accounts = merged.nodes.filter((n) => n.kind === "account").length;

  const expand = async (id: string) => {
    const target = expandCenter(byId.get(id));
    if (!target || !query) return;
    setExpanding(true);
    try {
      const g = await qc.fetchQuery(networkQueryOptions({ ...query, center: target, hops: 1 }));
      setExpansions((prev) => ({
        key: baseKey,
        graphs: [...(prev.key === baseKey ? prev.graphs : []), g],
      }));
    } finally {
      setExpanding(false);
    }
  };

  const setCenter = (code: string) =>
    router.replace(`${pathname}?customer=${encodeURIComponent(code)}`, { scroll: false });

  const linked = (id: string) =>
    merged.edges.filter(
      (e: NetworkEdge) => e.kind === "transfer" && (e.source === id || e.target === id),
    );
  const flows = node ? linked(node.id) : [];
  const inflow = flows.filter((e) => e.target === node?.id).reduce((s, e) => s + e.amount, 0);
  const outflow = flows.filter((e) => e.source === node?.id).reduce((s, e) => s + e.amount, 0);

  return (
    <>
      <PageHeader
        title={t("network.title")}
        subtitle={
          base.data
            ? t("network.subtitle", {
                accounts: formatNumber(accounts, locale),
                transfers: formatNumber(transfers.length, locale),
                amount: formatCompact(moved, locale),
                clusters: formatNumber(clusters.length, locale),
              })
            : t("network.subtitleLoading")
        }
      />
      <div className="flex flex-col gap-6 xl:flex-row">
        <section
          className="relative h-[calc(100dvh-230px)] min-h-130 min-w-0 flex-1 overflow-hidden rounded-lg border border-border bg-card"
          aria-busy={base.isFetching || expanding}
        >
          {query ? (
            <NetworkCanvas
              ref={canvas}
              nodes={merged.nodes}
              edges={merged.edges}
              resetKey={baseKey}
              center={base.data?.center ?? null}
              colorBy={colorBy}
              communities={communities}
              selected={selected}
              highlight={highlight}
              restrictedLabel={t("network.restricted")}
              label={t("network.canvasLabel", {
                count: merged.nodes.length,
                n: formatNumber(merged.nodes.length, locale),
              })}
              failedLabel={t("network.webglFailed")}
              onSelect={setSelected}
              onExpand={(id) => void expand(id)}
            />
          ) : featured.isPending ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <p className="p-6 text-text-secondary">{t("network.pickCustomer")}</p>
          )}

          <div className="absolute inset-s-3 top-3 flex items-center gap-2">
            <Segmented
              label={t("network.colorBy")}
              value={colorBy}
              onChange={setColorBy}
              className="bg-card"
              options={[
                { value: "risk", label: t("network.byRisk") },
                { value: "cluster", label: t("network.byCluster") },
              ]}
            />
            {base.isFetching || expanding || path.isFetching ? (
              <span className="rounded-full bg-card px-2.5 py-1 text-xs text-text-secondary shadow-sm">
                {t("common.loading")}
              </span>
            ) : null}
          </div>
          <div className="absolute inset-e-3 top-3 flex flex-col gap-1 rounded-md border border-border bg-card p-1 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label={t("network.zoomIn")}
              onClick={() => canvas.current?.zoomIn()}
            >
              <Plus />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label={t("network.zoomOut")}
              onClick={() => canvas.current?.zoomOut()}
            >
              <Minus />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label={t("network.fit")}
              onClick={() => canvas.current?.fit()}
            >
              <Maximize2 />
            </Button>
          </div>
          <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-end justify-between gap-2">
            <div className="rounded-md bg-card/90 px-3 py-2 shadow-sm backdrop-blur">
              <Legend />
            </div>
            <p className="rounded-md bg-card/90 px-3 py-2 text-xs text-text-secondary shadow-sm backdrop-blur">
              {t("network.hint")}
            </p>
          </div>
        </section>

        <aside className="flex w-full flex-col gap-4 xl:w-85 xl:shrink-0">
          <Panel className="gap-4 p-5">
            <PanelHeader
              eyebrow={t("network.center")}
              title={
                base.data?.center
                  ? (byId.get(base.data.center) as { name?: string } | undefined)?.name
                  : undefined
              }
            />
            <CustomerSearch onPick={setCenter} />
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-text-secondary">{t("network.hops")}</span>
              <Segmented
                label={t("network.hops")}
                value={hops}
                onChange={setHops}
                options={(["1", "2", "3"] as const).map((v) => ({
                  value: v,
                  label: formatNumber(Number(v), locale),
                }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-text-secondary">{t("network.period")}</span>
              <Segmented
                label={t("network.period")}
                value={period}
                onChange={setPeriod}
                options={(Object.keys(PERIODS) as Period[]).map((v) => ({
                  value: v,
                  label: t(`network.periods.${v}`),
                }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-text-secondary">{t("network.minAmount")}</span>
              <Segmented
                label={t("network.minAmount")}
                value={minAmount}
                onChange={setMinAmount}
                options={MIN_AMOUNTS.map((v) => ({
                  value: v,
                  label: v === "0" ? t("network.any") : formatCompact(Number(v), locale),
                }))}
              />
            </div>
            {base.data?.truncated ? <Note>{t("network.truncated")}</Note> : null}
            {base.isError ? <Note tone="danger">{t("network.loadFailed")}</Note> : null}
          </Panel>

          {node ? (
            <Panel className="gap-3 p-5">
              <div className="flex items-start gap-2">
                <PanelHeader
                  eyebrow={t(`network.kind.${node.kind}`)}
                  title={
                    node.kind === "account"
                      ? node.restricted
                        ? t("network.restricted")
                        : formatIban(node.iban)
                      : node.name
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="ms-auto size-7 shrink-0"
                  aria-label={t("forms.cancel")}
                  onClick={() => setSelected(null)}
                >
                  <X />
                </Button>
              </div>
              {node.kind === "customer" ? (
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-text-secondary">{t("customers.col.code")}</dt>
                    <dd>
                      <Link
                        href={href(`/customers/${node.code}`)}
                        className="font-mono text-link hover:underline"
                      >
                        {node.code}
                      </Link>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-text-secondary">{t("customers.col.risk")}</dt>
                    <dd>{formatNumber(node.riskScore, locale)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-text-secondary">{t("customers.col.alerts")}</dt>
                    <dd>{formatNumber(node.openAlerts, locale)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-text-secondary">{t("customers.col.pep")}</dt>
                    <dd>{node.pep ? t("common.yes") : t("common.no")}</dd>
                  </div>
                </dl>
              ) : null}
              {node.kind === "account" && node.restricted ? (
                <Note>{t("network.restrictedHint")}</Note>
              ) : null}
              {node.kind === "account" && !node.restricted ? (
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-text-secondary">{t("network.owner")}</dt>
                    <dd>
                      {node.ownerCode ? (
                        <Link
                          href={href(`/customers/${node.ownerCode}`)}
                          className="font-mono text-link hover:underline"
                        >
                          {node.ownerCode}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-text-secondary">{t("customers.col.alerts")}</dt>
                    <dd>{formatNumber(node.openAlerts, locale)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-text-secondary">{t("network.in")}</dt>
                    <dd className="ltr-nums">{formatMoney(inflow, "EUR", locale)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-text-secondary">{t("network.out")}</dt>
                    <dd className="ltr-nums">{formatMoney(outflow, "EUR", locale)}</dd>
                  </div>
                </dl>
              ) : null}
              {node.kind === "external" ? (
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div className="col-span-2">
                    <dt className="text-xs text-text-secondary">{t("fields.iban")}</dt>
                    <dd className="ltr-nums font-mono text-[13px]">{formatIban(node.iban)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-text-secondary">{t("fields.country")}</dt>
                    <dd>{t(`country.${node.country}`, { defaultValue: node.country })}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-text-secondary">{t("network.flows")}</dt>
                    <dd className="ltr-nums">{formatMoney(inflow + outflow, "EUR", locale)}</dd>
                  </div>
                  {node.highRisk ? (
                    <div className="col-span-2">
                      <Note tone="danger">{t("network.highRiskCountry")}</Note>
                    </div>
                  ) : null}
                </dl>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {expandCenter(node) ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={expanding}
                    onClick={() => void expand(node.id)}
                  >
                    <Expand /> {t("network.expand")}
                  </Button>
                ) : null}
                {node.kind === "account" && !node.restricted ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPathEnds((p) => ({ ...p, source: node.id }))}
                    >
                      <CircleDot /> {t("network.pathFrom")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!pathEnds.source || pathEnds.source === node.id}
                      onClick={() => setPathEnds((p) => ({ ...p, target: node.id }))}
                    >
                      <Route /> {t("network.pathTo")}
                    </Button>
                  </>
                ) : null}
                <Button size="sm" variant="ghost" onClick={() => canvas.current?.focus(node.id)}>
                  {t("network.focus")}
                </Button>
              </div>
            </Panel>
          ) : (
            <Note>{t("network.selectHint")}</Note>
          )}

          {pathEnds.source ? (
            <Panel className="gap-3 p-5">
              <div className="flex items-start gap-2">
                <PanelHeader
                  eyebrow={t("network.path")}
                  title={
                    !pathEnds.target
                      ? t("network.pathPickEnd")
                      : path.isFetching
                        ? t("common.loading")
                        : path.data?.path.length
                          ? t("network.pathFound", {
                              count: path.data.path.length - 1,
                              n: formatNumber(path.data.path.length - 1, locale),
                            })
                          : t("network.pathNone")
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="ms-auto size-7 shrink-0"
                  aria-label={t("network.clearPath")}
                  onClick={() => setPathEnds({ source: null, target: null })}
                >
                  <X />
                </Button>
              </div>
              {path.data?.path.length ? (
                <ol className="flex flex-col gap-1.5 text-sm">
                  {path.data.path.map((id, i) => {
                    const n = byId.get(id);
                    const next = path.data!.path[i + 1];
                    const e = next
                      ? merged.edges.find(
                          (x) =>
                            x.kind === "transfer" &&
                            ((x.source === id && x.target === next) ||
                              (x.source === next && x.target === id)),
                        )
                      : undefined;
                    return (
                      <li key={id} className="flex flex-col">
                        <button
                          type="button"
                          className="text-start font-mono text-[13px] text-link hover:underline"
                          onClick={() => {
                            setSelected(id);
                            canvas.current?.focus(id);
                          }}
                        >
                          {n?.kind === "account"
                            ? n.restricted
                              ? n.iban
                              : `${n.ownerCode ?? ""} · •••• ${n.iban.slice(-4)}`
                            : id}
                        </button>
                        {e ? (
                          <span className="ps-3 text-xs text-text-secondary">
                            ↓ {formatMoney(e.amount, "EUR", locale)} ·{" "}
                            {t("network.transfersCount", {
                              count: e.count,
                              n: formatNumber(e.count, locale),
                            })}
                          </span>
                        ) : null}
                      </li>
                    );
                  })}
                </ol>
              ) : null}
            </Panel>
          ) : null}

          <Panel className="gap-3 p-5">
            <PanelHeader
              eyebrow={t("network.clusters")}
              title={
                clusters.length
                  ? t("network.clustersTitle", {
                      count: clusters.length,
                      n: formatNumber(clusters.length, locale),
                    })
                  : t("network.noClusters")
              }
            />
            <ul className="flex flex-col gap-1.5">
              {clusters.slice(0, 6).map((c, i) => (
                <li key={c.id}>
                  <button
                    type="button"
                    aria-pressed={cluster === c.id}
                    onClick={() => {
                      setCluster(cluster === c.id ? null : c.id);
                      setColorBy("cluster");
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md border px-3 py-2 text-start text-sm",
                      cluster === c.id
                        ? "border-brand bg-brand-soft"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    <span className="flex-1">
                      {t("network.cluster", {
                        n: formatNumber(i + 1, locale),
                        accounts: formatNumber(c.accounts, locale),
                      })}
                    </span>
                    <span className="ltr-nums text-xs text-text-secondary">
                      {formatCompact(c.amount, locale)} €
                    </span>
                    {c.highRisk ? (
                      <span className="rounded-full bg-risk-high-bg px-2 py-0.5 text-xs text-risk-high-text">
                        {t("network.highRisk")}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        </aside>
      </div>
    </>
  );
};
