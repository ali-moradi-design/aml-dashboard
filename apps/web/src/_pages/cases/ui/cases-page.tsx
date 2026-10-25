"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FolderPlus, KanbanSquare, Search, Table2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useCan } from "@/entities/session";
import { CaseBoard } from "./case-board";
import { CasesGrid } from "./cases-grid";
import { useHref, useLocale } from "@/shared/i18n/use-locale";
import { formatNumber } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { PageHeader } from "@/shared/ui/panel";

const quick = ["mine", "urgent", "awaitingApproval"] as const;
type View = "table" | "board";

export const CasesPage = () => {
  const { t } = useTranslation();
  const locale = useLocale();
  const href = useHref();
  const can = useCan();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  // The view lives in the URL so a shared link opens the same layout.
  const view: View = params?.get("view") === "board" ? "board" : "table";
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
    if (active.has("mine")) f.mine = "true";
    if (active.has("urgent")) f.priority = ["HIGH", "CRITICAL"];
    if (active.has("awaitingApproval")) f.status = ["PENDING_APPROVAL"];
    return f;
  }, [debounced, active]);

  const setView = (v: View) => router.replace(`${pathname}${v === "board" ? "?view=board" : ""}`, { scroll: false });

  return (
    <>
      <PageHeader
        title={t("cases.title")}
        subtitle={view === "board" ? t("cases.boardSubtitle") : count === null ? t("alerts.subtitleLoading") : t("cases.subtitle", { count: formatNumber(count, locale) as never })}
        actions={
          can("cases.create") ? (
            <Button size="lg" asChild>
              <Link href={href("/cases/new")}>
                <FolderPlus /> {t("cases.new")}
              </Link>
            </Button>
          ) : null
        }
      />
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4">
        <label className="flex h-9 min-w-[240px] flex-1 items-center gap-2 rounded-md border border-border bg-muted px-3 text-text-secondary focus-within:ring-2 focus-within:ring-ring">
          <Search className="size-4" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("cases.search")} className="min-w-0 flex-1 bg-transparent text-text outline-none placeholder:text-text-secondary" />
        </label>
        {quick.map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={active.has(k)}
            onClick={() => setActive((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; })}
            className={cn("h-8 rounded-full border px-3 text-sm transition-colors", active.has(k) ? "border-brand bg-brand text-on-brand" : "border-border text-text-secondary hover:text-text")}
          >
            {t(`cases.quick.${k}`)}
          </button>
        ))}
        <div role="radiogroup" aria-label={t("cases.view")} className="ms-auto flex rounded-md border border-border p-0.5">
          {([["table", Table2], ["board", KanbanSquare]] as const).map(([v, Icon]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={view === v}
              onClick={() => setView(v)}
              className={cn("flex h-7 items-center gap-1.5 rounded-sm px-2.5 text-sm", view === v ? "bg-brand-soft text-heading" : "text-text-secondary hover:text-text")}
            >
              <Icon className="size-4" /> {t(`cases.views.${v}`)}
            </button>
          ))}
        </div>
      </div>
      {view === "board" ? <CaseBoard filters={filters} /> : <CasesGrid filters={filters} onCount={setCount} />}
    </>
  );
};
