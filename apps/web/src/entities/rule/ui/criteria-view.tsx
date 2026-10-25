"use client";

import { useTranslation } from "react-i18next";
import type { Condition, CriteriaGroup } from "@aml/shared";

const valueText = (v: Condition["value"]) => (Array.isArray(v) ? v.join(" – ") : String(v));

/** Read-only rendering of an AND/OR criteria tree. */
export const CriteriaView = ({ group }: { group: CriteriaGroup }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-border p-3">
      <span className="w-fit rounded-sm bg-brand-soft px-1.5 py-0.5 text-xs text-heading uppercase">
        {t(`criteria.combinator.${group.combinator}`)}
      </span>
      {group.children.map((c, i) =>
        c.kind === "group" ? (
          <CriteriaView key={i} group={c} />
        ) : (
          <p key={i} className="text-sm">
            <span className="text-text-secondary">{t(`criteria.field.${c.field}`)}</span>{" "}
            <span className="text-heading">{t(`criteria.op.${c.operator}`)}</span>{" "}
            <span className="ltr-nums font-mono text-xs">{valueText(c.value)}</span>
          </p>
        ),
      )}
    </div>
  );
};
