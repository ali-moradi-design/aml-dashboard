"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertFilters, type AlertFilterValues } from "./alert-filters";
import { AlertsGrid } from "./alerts-grid";
import { useLocale } from "@/shared/i18n/use-locale";
import { formatNumber } from "@/shared/lib/format";
import { PageHeader } from "@/shared/ui/panel";

const fromParams = (p: URLSearchParams): AlertFilterValues => ({
  status: p.getAll("status"),
  riskLevel: p.getAll("riskLevel"),
  ruleCode: p.get("ruleCode") ?? undefined,
  branchCode: p.get("branchCode") ?? undefined,
  search: p.get("search") ?? undefined,
  assignee: p.get("assignee") === "me" ? "me" : undefined,
});

const toParams = (v: AlertFilterValues) => {
  const p = new URLSearchParams();
  v.status.forEach((s) => p.append("status", s));
  v.riskLevel.forEach((r) => p.append("riskLevel", r));
  (["ruleCode", "branchCode", "search", "assignee"] as const).forEach((k) => v[k] && p.set(k, v[k]!));
  return p;
};

export const AlertsPage = () => {
  const { t } = useTranslation();
  const locale = useLocale();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [count, setCount] = useState<number | null>(null);
  const filters = useMemo(() => fromParams(new URLSearchParams(params?.toString() ?? "")), [params]);

  const onChange = useCallback((v: AlertFilterValues) => router.replace(`${pathname}?${toParams(v).toString()}`, { scroll: false }), [router, pathname]);

  const gridFilters = useMemo(() => {
    const f: Record<string, string | string[]> = {};
    if (filters.status.length) f.status = filters.status;
    if (filters.riskLevel.length) f.riskLevel = filters.riskLevel;
    if (filters.ruleCode) f.ruleCode = filters.ruleCode;
    if (filters.branchCode) f.branchCode = filters.branchCode;
    if (filters.search) f.search = filters.search;
    if (filters.assignee) f.assignee = filters.assignee;
    return f;
  }, [filters]);

  return (
    <>
      <PageHeader title={t("alerts.title")} subtitle={count === null ? t("alerts.subtitleLoading") : t("alerts.subtitle", { count: formatNumber(count, locale) as never })} />
      <AlertFilters value={filters} onChange={onChange} />
      <AlertsGrid filters={gridFilters} onCount={setCount} />
    </>
  );
};
