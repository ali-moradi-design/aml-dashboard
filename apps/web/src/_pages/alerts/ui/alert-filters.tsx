"use client";

import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { alertStatuses, riskLevels } from "@aml/shared";
import { useReference } from "@/entities/reference";
import { useRuleText } from "@/entities/rule";
import { cn } from "@/shared/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

export type AlertFilterValues = {
  status: string[];
  riskLevel: string[];
  ruleCode?: string;
  branchCode?: string;
  search?: string;
  assignee?: "me";
};

const Chip = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    aria-pressed={active}
    onClick={onClick}
    className={cn(
      "h-8 rounded-full border px-3 text-sm whitespace-nowrap transition-colors",
      active
        ? "border-brand bg-brand text-on-brand"
        : "border-border bg-card text-text-secondary hover:text-text",
    )}
  >
    {children}
  </button>
);

const toggle = (list: string[], value: string) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

/** Filter bar for the alert grid. The page keeps the values in the URL so links can be shared. */
export const AlertFilters = ({
  value,
  onChange,
}: {
  value: AlertFilterValues;
  onChange: (v: AlertFilterValues) => void;
}) => {
  const { t } = useTranslation();
  const { data: ref } = useReference();
  const ruleText = useRuleText();
  const [search, setSearch] = useState(value.search ?? "");

  // Debounce typing so the grid does not reload on every key.
  useEffect(() => {
    const id = setTimeout(() => {
      if ((value.search ?? "") !== search) onChange({ ...value, search: search || undefined });
    }, 350);
    return () => clearTimeout(id);
  }, [search, value, onChange]);

  const all = "__all";
  const hasFilters =
    value.status.length ||
    value.riskLevel.length ||
    value.ruleCode ||
    value.branchCode ||
    value.search ||
    value.assignee;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex h-9 min-w-60 flex-1 items-center gap-2 rounded-md border border-border bg-muted px-3 text-text-secondary focus-within:ring-2 focus-within:ring-ring">
          <Search className="size-4" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("alerts.filters.search")}
            className="min-w-0 flex-1 bg-transparent text-text outline-none placeholder:text-text-secondary"
          />
        </label>
        <Select
          value={value.ruleCode ?? all}
          onValueChange={(v) => onChange({ ...value, ruleCode: v === all ? undefined : v })}
        >
          <SelectTrigger className="w-55">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={all}>{t("alerts.filters.allRules")}</SelectItem>
            {ref?.rules.map((r) => (
              <SelectItem key={r.code} value={r.code}>
                {ruleText.name(r.code, r.name)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={value.branchCode ?? all}
          onValueChange={(v) => onChange({ ...value, branchCode: v === all ? undefined : v })}
        >
          <SelectTrigger className="w-45">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={all}>{t("alerts.filters.allBranches")}</SelectItem>
            {ref?.branches.map((b) => (
              <SelectItem key={b.code} value={b.code}>
                {b.city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {alertStatuses.map((s) => (
          <Chip
            key={s}
            active={value.status.includes(s)}
            onClick={() => onChange({ ...value, status: toggle(value.status, s) })}
          >
            {t(`alertStatus.${s}`)}
          </Chip>
        ))}
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        {riskLevels.map((r) => (
          <Chip
            key={r}
            active={value.riskLevel.includes(r)}
            onClick={() => onChange({ ...value, riskLevel: toggle(value.riskLevel, r) })}
          >
            {t(`risk.${r}`)}
          </Chip>
        ))}
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        <Chip
          active={value.assignee === "me"}
          onClick={() => onChange({ ...value, assignee: value.assignee ? undefined : "me" })}
        >
          {t("alerts.filters.mine")}
        </Chip>
        {hasFilters ? (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              onChange({ status: [], riskLevel: [] });
            }}
            className="ms-auto flex items-center gap-1 text-sm text-link hover:underline"
          >
            <X className="size-4" /> {t("alerts.filters.clear")}
          </button>
        ) : null}
      </div>
    </div>
  );
};
