"use client";

import Link from "next/link";
import { Search, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useCan } from "@/entities/session";
import { CustomersGrid } from "./customers-grid";
import { useHref, useLocale } from "@/shared/i18n/use-locale";
import { formatNumber } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { PageHeader } from "@/shared/ui/panel";

const quick = ["highRisk", "pep", "company", "kycPending"] as const;

export const CustomersPage = () => {
  const { t } = useTranslation();
  const locale = useLocale();
  const href = useHref();
  const can = useCan();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [active, setActive] = useState<Set<string>>(new Set());
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(id);
  }, [search]);

  const filters = useMemo(() => {
    const f: Record<string, string | string[]> = {};
    if (debounced) f.search = debounced;
    if (active.has("highRisk")) f.highRisk = "true";
    if (active.has("pep")) f.pep = "true";
    if (active.has("company")) f.type = ["COMPANY"];
    if (active.has("kycPending")) f.kycStatus = ["PENDING", "EXPIRED"];
    return f;
  }, [debounced, active]);

  return (
    <>
      <PageHeader
        title={t("customers.title")}
        subtitle={count === null ? t("alerts.subtitleLoading") : t("customers.subtitle", { count: formatNumber(count, locale) as never })}
        actions={
          can("customers.manage") ? (
            <Button size="lg" asChild>
              <Link href={href("/customers/new")}>
                <UserPlus /> {t("customers.new")}
              </Link>
            </Button>
          ) : null
        }
      />
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4">
        <label className="flex h-9 min-w-[260px] flex-1 items-center gap-2 rounded-md border border-border bg-muted px-3 text-text-secondary focus-within:ring-2 focus-within:ring-ring">
          <Search className="size-4" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("customers.search")} className="min-w-0 flex-1 bg-transparent text-text outline-none placeholder:text-text-secondary" />
        </label>
        {quick.map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={active.has(k)}
            onClick={() => setActive((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; })}
            className={cn("h-8 rounded-full border px-3 text-sm transition-colors", active.has(k) ? "border-brand bg-brand text-on-brand" : "border-border text-text-secondary hover:text-text")}
          >
            {t(`customers.quick.${k}`)}
          </button>
        ))}
      </div>
      <CustomersGrid filters={filters} onCount={setCount} />
    </>
  );
};
