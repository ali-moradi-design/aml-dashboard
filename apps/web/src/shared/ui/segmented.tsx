"use client";

import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

type Option<T extends string> = { value: T; label: ReactNode };

/** Small radio group styled as a segmented control (arrow keys move between options). */
export const Segmented = <T extends string>({ value, options, onChange, label, className }: { value: T; options: Array<Option<T>>; onChange: (v: T) => void; label: string; className?: string }) => (
  <div
    role="radiogroup"
    aria-label={label}
    className={cn("flex rounded-md border border-border p-0.5", className)}
    onKeyDown={(e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const i = options.findIndex((o) => o.value === value);
      const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
      const step = (e.key === "ArrowRight") !== rtl ? 1 : -1;
      const next = options[(i + step + options.length) % options.length]!;
      onChange(next.value);
      (e.currentTarget.querySelector(`[data-value="${next.value}"]`) as HTMLElement | null)?.focus();
    }}
  >
    {options.map((o) => (
      <button
        key={o.value}
        type="button"
        role="radio"
        data-value={o.value}
        aria-checked={value === o.value}
        tabIndex={value === o.value ? 0 : -1}
        onClick={() => onChange(o.value)}
        className={cn(
          "flex h-7 flex-1 items-center justify-center gap-1.5 rounded-sm px-2.5 text-sm whitespace-nowrap focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          value === o.value ? "bg-brand-soft text-heading" : "text-text-secondary hover:text-text",
        )}
      >
        {o.label}
      </button>
    ))}
  </div>
);
