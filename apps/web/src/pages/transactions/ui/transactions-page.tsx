"use client";

import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { criteriaGroupSchema, emptyCriteria, type CriteriaGroup } from "@aml/shared";
import { CriteriaBuilder, countConditions } from "@/features/criteria-builder";
import { TransactionsGrid } from "@/widgets/transactions-grid";
import { useLocale } from "@/shared/i18n/use-locale";
import { formatNumber } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { PageHeader } from "@/shared/ui/panel";

const c = (field: string, operator: string, value: unknown) => ({ kind: "condition", field, operator, value }) as const;

// Ready-made searches that match the alert rules, so a reviewer can start from a known pattern.
const presets: Record<string, CriteriaGroup> = {
  structuring: { kind: "group", combinator: "and", children: [c("channel", "eq", "CASH"), c("direction", "eq", "IN"), c("baseAmount", "between", [9000, 9999])] } as CriteriaGroup,
  highRisk: { kind: "group", combinator: "and", children: [c("counterpartyCountry", "in", ["XA", "XB", "XC"]), c("baseAmount", "gte", 10000)] } as CriteriaGroup,
  largeWires: {
    kind: "group",
    combinator: "and",
    children: [c("channel", "eq", "WIRE"), { kind: "group", combinator: "or", children: [c("baseAmount", "gte", 100000), c("counterpartyCountry", "in", ["AE", "CH"])] }],
  } as CriteriaGroup,
};

export const TransactionsPage = () => {
  const { t } = useTranslation();
  const locale = useLocale();
  const [draft, setDraft] = useState<CriteriaGroup>(emptyCriteria());
  const [applied, setApplied] = useState<CriteriaGroup | undefined>();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(id);
  }, [search]);

  const valid = criteriaGroupSchema.safeParse(draft).success;
  const activeConditions = applied ? countConditions(applied) : 0;

  return (
    <>
      <PageHeader
        title={t("transactions.title")}
        subtitle={count === null ? t("alerts.subtitleLoading") : t("transactions.subtitle", { count: formatNumber(count, locale) as never })}
      />

      <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex h-9 min-w-[260px] flex-1 items-center gap-2 rounded-md border border-border bg-muted px-3 text-text-secondary focus-within:ring-2 focus-within:ring-ring">
            <Search className="size-4" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("transactions.search")}
              className="min-w-0 flex-1 bg-transparent text-text outline-none placeholder:text-text-secondary"
            />
          </label>
          <Button variant="outline" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            <SlidersHorizontal /> {t("transactions.advanced")}
            {activeConditions ? <span className="rounded-full bg-brand px-1.5 text-xs text-on-brand">{formatNumber(activeConditions, locale)}</span> : null}
            <ChevronDown className={cn("transition-transform", open && "rotate-180")} />
          </Button>
        </div>

        {open ? (
          <div className="flex flex-col gap-3 border-t border-border pt-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-text-secondary">{t("transactions.presets")}</span>
              {Object.keys(presets).map((k) => (
                <button key={k} type="button" onClick={() => setDraft(presets[k]!)} className="rounded-full border border-border px-3 py-1 text-text-secondary hover:border-brand hover:text-text">
                  {t(`transactions.preset.${k}`)}
                </button>
              ))}
            </div>
            <CriteriaBuilder value={draft} onChange={setDraft} />
            <div className="flex gap-2">
              <Button disabled={!valid} onClick={() => setApplied(draft.children.length ? draft : undefined)}>
                {t("transactions.apply")}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setDraft(emptyCriteria());
                  setApplied(undefined);
                }}
              >
                {t("transactions.reset")}
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <TransactionsGrid filters={{ criteria: applied, search: debounced || undefined }} onCount={setCount} />
    </>
  );
};
