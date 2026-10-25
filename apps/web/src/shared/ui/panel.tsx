import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

/** Card surface used by every dashboard block. */
export const Panel = ({ className, children }: { className?: string; children: ReactNode }) => (
  <section
    className={cn("flex flex-col gap-5 rounded-lg border border-border bg-card p-6", className)}
  >
    {children}
  </section>
);

/**
 * Card header: a small label naming the metric, and a one-line takeaway as the title,
 * so every chart says something (see docs/decisions.md "Charts must say something").
 */
export const PanelHeader = ({
  eyebrow,
  title,
  actions,
}: {
  eyebrow: string;
  title?: ReactNode;
  actions?: ReactNode;
}) => (
  <header className="flex items-start gap-3">
    <div className="min-w-0 flex-1">
      <p className="text-xs text-text-secondary">{eyebrow}</p>
      {title ? <h2 className="mt-1 text-base text-text">{title}</h2> : null}
    </div>
    {actions}
  </header>
);

export const Note = ({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "danger";
}) => (
  <p
    className={cn(
      "rounded-md px-3 py-2.5 text-xs",
      tone === "danger"
        ? "flex items-center gap-2.5 bg-risk-high-bg text-risk-high-text before:size-2 before:shrink-0 before:rounded-full before:bg-risk-high"
        : "bg-muted text-text-secondary",
    )}
  >
    {children}
  </p>
);

export const PageHeader = ({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) => (
  <header className="flex flex-wrap items-end gap-3">
    <div className="min-w-0 flex-1">
      <h1 className="text-2xl text-heading">{title}</h1>
      {subtitle ? <p className="mt-1 text-text-secondary">{subtitle}</p> : null}
    </div>
    {actions}
  </header>
);
