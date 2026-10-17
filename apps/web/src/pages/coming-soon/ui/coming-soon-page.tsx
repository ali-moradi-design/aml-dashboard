"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { upcomingSections } from "@/shared/config/navigation";
import { useHref } from "@/shared/i18n/use-locale";
import { Button } from "@/shared/ui/button";

/** Placeholder for screens that arrive in later releases (see docs/releases.md). */
export const ComingSoonPage = ({ section }: { section: string }) => {
  const { t } = useTranslation();
  const href = useHref();
  const item = upcomingSections.find((s) => s.path === `/${section}`);
  const Icon = item?.icon;

  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        {Icon ? (
          <span className="grid size-14 place-items-center rounded-xl bg-brand-soft text-heading">
            <Icon className="size-7" strokeWidth={1.5} />
          </span>
        ) : null}
        <h1 className="text-2xl text-heading">{item ? t(`nav.${item.key}`) : section}</h1>
        <p className="text-text-secondary">{t("comingSoon.text", { release: item?.release ?? 2 })}</p>
        <Button variant="outline" asChild>
          <Link href={href("/")}>{t("comingSoon.back")}</Link>
        </Button>
      </div>
    </div>
  );
};
