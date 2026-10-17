"use client";

import { AlertCircle } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { type FieldErrors, type FieldValues, type Path, type UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { isHttpError } from "@/shared/api";
import { cn } from "@/shared/lib/utils";
import { Label } from "@/shared/ui/label";

/** Reads a nested error (e.g. "shareholders.0.documents.1.number") from RHF's error tree. */
export const errorAt = (errors: FieldErrors, path: string): string | undefined => {
  const node = path.split(".").reduce<unknown>((acc, key) => (acc as Record<string, unknown> | undefined)?.[key], errors) as
    | { message?: string; root?: { message?: string } }
    | undefined;
  return node?.message ?? node?.root?.message;
};

export const fieldId = (name: string) => `field-${name.replace(/\./g, "-")}`;

type FieldProps = { name: string; label: string; errors: FieldErrors; hint?: string; children: ReactNode; className?: string; required?: boolean };

/** Label + control + translated error, wired with aria-describedby for screen readers. */
export const Field = ({ name, label, errors, hint, children, className, required }: FieldProps) => {
  const { t } = useTranslation();
  const message = errorAt(errors, name);
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={fieldId(name)}>
        {label}
        {required ? <span className="text-risk-high-text" aria-hidden> *</span> : null}
      </Label>
      {children}
      {hint && !message ? <p className="text-xs text-text-secondary">{hint}</p> : null}
      {message ? (
        <p id={`${fieldId(name)}-error`} className="text-xs text-risk-high-text">
          {t(message, { defaultValue: message })}
        </p>
      ) : null}
    </div>
  );
};

/** Props for inputs inside <Field>: id, aria-invalid, aria-describedby. */
export const a11y = (name: string, errors: FieldErrors) => {
  const invalid = Boolean(errorAt(errors, name));
  return { id: fieldId(name), "aria-invalid": invalid, "aria-describedby": invalid ? `${fieldId(name)}-error` : undefined };
};

const flatten = (errors: FieldErrors, prefix = ""): Array<{ path: string; message: string }> =>
  Object.entries(errors).flatMap(([key, value]) => {
    if (!value || key === "ref") return [];
    const path = prefix ? `${prefix}.${key}` : key;
    const v = value as { message?: string; type?: string };
    const own = typeof v.message === "string" && v.message ? [{ path: key === "root" ? prefix : path, message: v.message }] : [];
    const nested = typeof value === "object" ? flatten(value as FieldErrors, path) : [];
    return [...own, ...nested.filter((n) => !n.path.endsWith(".ref"))];
  });

/**
 * Accessibility: lists every error at the top of the form after a failed submit, and moves
 * focus to the first invalid field.
 */
export const ErrorSummary = ({ errors, submitCount }: { errors: FieldErrors; submitCount: number }) => {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const items = flatten(errors).filter((e, i, all) => all.findIndex((x) => x.path === e.path) === i);
  useEffect(() => {
    if (!submitCount || !items.length) return;
    ref.current?.focus();
    const first = document.getElementById(fieldId(items[0]!.path));
    first?.focus({ preventScroll: true });
    first?.scrollIntoView({ block: "center", behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per submit attempt
  }, [submitCount]);
  if (!submitCount || !items.length) return null;
  return (
    <div ref={ref} tabIndex={-1} role="alert" aria-labelledby="error-summary-title" className="rounded-md border border-risk-high bg-risk-high-bg p-4 text-risk-high-text outline-none">
      <p id="error-summary-title" className="flex items-center gap-2">
        <AlertCircle className="size-4" /> {t("forms.errorSummary", { count: items.length })}
      </p>
      <ul className="mt-2 list-disc ps-6 text-sm">
        {items.slice(0, 8).map((e) => (
          <li key={e.path}>
            <a href={`#${fieldId(e.path)}`} className="underline" onClick={(ev) => {
              ev.preventDefault();
              document.getElementById(fieldId(e.path))?.focus();
            }}>
              {t(`fields.${e.path.replace(/\.\d+\./g, ".").replace(/\.\d+$/, "")}`, { defaultValue: e.path })}: {t(e.message, { defaultValue: e.message })}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

/** Maps API validation errors ({ issues: [{ path, message }] }) onto form fields. Returns true when mapped. */
export const applyServerErrors = <T extends FieldValues>(form: UseFormReturn<T>, error: unknown): boolean => {
  if (!isHttpError(error) || error.status !== 400 || !Array.isArray(error.issues)) return false;
  let mapped = false;
  for (const issue of error.issues as Array<{ path?: Array<string | number>; message?: string }>) {
    if (!issue.path?.length) continue;
    form.setError(issue.path.join(".") as Path<T>, { type: "server", message: issue.message ?? "errors.invalid" });
    mapped = true;
  }
  return mapped;
};
