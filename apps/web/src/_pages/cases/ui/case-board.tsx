"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import type { GridQuery } from "@aml/shared";
import { RiskBadge } from "@/entities/alert";
import { CaseStatusBadge, DueLabel, PriorityLabel, useCaseBoard } from "@/entities/case";
import { useHref, useLocale } from "@/shared/i18n/use-locale";
import { formatMoney, formatNumber } from "@/shared/lib/format";
import { Skeleton } from "@/shared/ui/skeleton";

/**
 * Board view: one column per status in the fixed chain. Cards are links, not drag targets,
 * because a move needs a reason, a second person (four-eyes) or a SAR reference.
 */
export const CaseBoard = ({ filters }: { filters: GridQuery["filters"] }) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const href = useHref();
  const { data, isPending, isError } = useCaseBoard(filters);

  if (isError) return <p className="text-text-secondary">{t("errors.generic")}</p>;

  return (
    <div className="grid auto-cols-[minmax(260px,1fr)] grid-flow-col gap-4 overflow-x-auto pb-2">
      {(isPending
        ? (["OPEN", "PENDING_APPROVAL", "APPROVED", "REPORTED", "CLOSED"] as const).map(
            (status) => ({ status, count: 0, cases: [] }),
          )
        : data.columns
      ).map((col) => (
        <section
          key={col.status}
          aria-labelledby={`col-${col.status}`}
          className="flex min-h-105 flex-col gap-3 rounded-lg bg-muted p-3"
        >
          <header className="flex items-center justify-between px-1">
            <h2 id={`col-${col.status}`}>
              <CaseStatusBadge status={col.status} />
            </h2>
            <span className="text-xs text-text-secondary">
              {isPending ? "" : formatNumber(col.count, locale)}
            </span>
          </header>
          {isPending ? (
            Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-28" />)
          ) : (
            <ul className="flex flex-col gap-2.5">
              {col.cases.map((c) => (
                <li key={c.id}>
                  <Link
                    href={href(`/cases/${c.code}`)}
                    className="flex flex-col gap-2 rounded-md border border-border bg-card p-3 transition-shadow hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-link">{c.code}</span>
                      <RiskBadge level={c.riskLevel} />
                    </span>
                    <span className="line-clamp-2 text-sm text-text">{c.title}</span>
                    <span className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-secondary">
                      <PriorityLabel priority={c.priority} />
                      <DueLabel dueAt={c.dueAt} status={c.status} />
                    </span>
                    {c.totalAmount ? (
                      <span className="ltr-nums text-xs text-text-secondary">
                        {formatMoney(c.totalAmount, "EUR", locale)}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
              {col.count > col.cases.length ? (
                <li className="px-1 text-xs text-text-secondary">
                  {t("cases.boardMore", { count: col.count - col.cases.length })}
                </li>
              ) : null}
              {!col.count ? (
                <li className="px-1 text-xs text-text-secondary">{t("cases.boardEmpty")}</li>
              ) : null}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
};
