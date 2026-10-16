"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";

const options = [
  { value: "light", Icon: Sun, label: "theme.light" },
  { value: "dark", Icon: Moon, label: "theme.dark" },
] as const;

/** Segmented light/dark switch for the app bar (see the Figma "Theme toggle" component). */
export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  // The stored theme is only known in the browser; render a neutral state until then.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div role="radiogroup" className="flex h-10 items-center gap-0.5 rounded-md border border-border bg-muted p-[3px]">
      {options.map(({ value, Icon, label }) => {
        const active = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={t(label)}
            onClick={() => setTheme(value)}
            className={`grid h-8 w-[34px] place-items-center rounded-sm transition-colors duration-200 ${
              active ? "bg-card text-heading shadow-sm dark:bg-accent dark:text-on-accent" : "text-text-secondary hover:text-text"
            }`}
          >
            <Icon className="size-[18px]" strokeWidth={1.75} />
          </button>
        );
      })}
    </div>
  );
};
