"use client";

import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import type { UserRef } from "@aml/shared";
import { cn } from "@/shared/lib/utils";
import { Textarea } from "@/shared/ui/textarea";

type Props = {
  value: string;
  onChange: (value: string) => void;
  people: UserRef[];
  onSubmit?: () => void;
  placeholder?: string;
  label: string;
  autoFocus?: boolean;
};

/** Text of the current "@word" right before the caret, or null. */
const queryAt = (text: string, caret: number) =>
  /(?:^|\s)@([\p{L}\p{N}_-]*)$/u.exec(text.slice(0, caret))?.[1] ?? null;

/**
 * Textarea with an @mention picker (WAI-ARIA combobox pattern): arrows move, Enter or Tab
 * picks, Escape closes. Ctrl/Cmd+Enter sends.
 */
export const MentionInput = ({
  value,
  onChange,
  people,
  onSubmit,
  placeholder,
  label,
  autoFocus,
}: Props) => {
  const { t } = useTranslation();
  const ref = useRef<HTMLTextAreaElement>(null);
  const listId = useId();
  const [query, setQuery] = useState<string | null>(null);
  const [active, setActive] = useState(0);

  const matches = useMemo(
    () =>
      query === null
        ? []
        : people.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6),
    [people, query],
  );
  const open = matches.length > 0;

  const pick = (person: UserRef) => {
    const el = ref.current;
    if (!el || query === null) return;
    const caret = el.selectionStart;
    const start = caret - query.length - 1;
    const next = `${value.slice(0, start)}@${person.name} ${value.slice(caret)}`;
    onChange(next);
    setQuery(null);
    requestAnimationFrame(() => {
      const pos = start + person.name.length + 2;
      el.setSelectionRange(pos, pos);
      el.focus();
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (open) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => (i + 1) % matches.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => (i - 1 + matches.length) % matches.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        pick(matches[active]!);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setQuery(null);
        return;
      }
    }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onSubmit?.();
    }
  };

  return (
    <div className="relative">
      <Textarea
        ref={ref}
        rows={3}
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-label={label}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        onChange={(e) => {
          onChange(e.target.value);
          setQuery(queryAt(e.target.value, e.target.selectionStart));
          setActive(0);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => setTimeout(() => setQuery(null), 120)}
      />
      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={t("comments.mentionList")}
          className="absolute inset-s-0 top-full z-20 mt-1 w-64 overflow-hidden rounded-md border border-border bg-card py-1 shadow-md"
        >
          {matches.map((p, i) => (
            <li
              key={p.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(p);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-2 px-3 py-1.5 text-sm",
                i === active && "bg-muted",
              )}
            >
              <span className="truncate">{p.name}</span>
              <span className="text-xs text-text-secondary">
                {t(`role.${p.role}`, { defaultValue: p.role })}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};
