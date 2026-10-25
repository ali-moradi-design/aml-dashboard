"use client";

import { Check } from "lucide-react";
import { cn } from "@/shared/lib/utils";

type Props = {
  steps: Array<{ key: string; label: string }>;
  current: number;
  completed: Set<number>;
  onSelect: (i: number) => void;
};

/** Step indicator for multi-step forms. Earlier or completed steps can be revisited. */
export const Stepper = ({ steps, current, completed, onSelect }: Props) => (
  <ol className="flex flex-wrap items-center gap-2">
    {steps.map((s, i) => {
      const done = completed.has(i) && i !== current;
      const reachable = i <= current || completed.has(i) || completed.has(i - 1);
      return (
        <li key={s.key} className="flex items-center gap-2">
          <button
            type="button"
            disabled={!reachable}
            aria-current={i === current ? "step" : undefined}
            onClick={() => onSelect(i)}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors disabled:opacity-50",
              i === current
                ? "border-brand bg-brand text-on-brand"
                : done
                  ? "border-brand bg-brand-soft text-heading"
                  : "border-border bg-card text-text-secondary",
            )}
          >
            <span
              className={cn(
                "grid size-5 place-items-center rounded-full text-xs",
                i === current ? "bg-on-brand/20" : "bg-muted",
              )}
            >
              {done ? <Check className="size-3" /> : i + 1}
            </span>
            {s.label}
          </button>
          {i < steps.length - 1 ? <span className="h-px w-6 bg-border" aria-hidden /> : null}
        </li>
      );
    })}
  </ol>
);
