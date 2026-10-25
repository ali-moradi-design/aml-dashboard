"use client";

import { Bell, KeyRound, Palette, Server, Star, UserRound, type LucideIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useCan } from "@/entities/session";
import { useMySettings } from "@/entities/settings";
import { cn } from "@/shared/lib/utils";
import { PageHeader } from "@/shared/ui/panel";
import { Skeleton } from "@/shared/ui/skeleton";
import { AppearanceSection, NotificationsSection, QuickAccessSection } from "./preference-sections";
import { ProfileSection } from "./profile-section";
import { SecuritySection } from "./security-section";
import { SystemSection } from "./system-section";

const SECTIONS: Array<{
  key: string;
  icon: LucideIcon;
  admin?: boolean;
  render: () => React.ReactNode;
}> = [
  { key: "profile", icon: UserRound, render: () => <ProfileSection /> },
  { key: "appearance", icon: Palette, render: () => <AppearanceSection /> },
  { key: "notifications", icon: Bell, render: () => <NotificationsSection /> },
  { key: "quickAccess", icon: Star, render: () => <QuickAccessSection /> },
  { key: "security", icon: KeyRound, render: () => <SecuritySection /> },
  { key: "system", icon: Server, admin: true, render: () => <SystemSection /> },
];

/** Section in the URL (?section=security), so links from the user menu and the palette can open one. */
export const SettingsPage = () => {
  const { t } = useTranslation();
  const can = useCan();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { isPending } = useMySettings();
  const sections = SECTIONS.filter((s) => !s.admin || can("admin.manage"));
  const current = sections.find((s) => s.key === params?.get("section")) ?? sections[0]!;

  return (
    <>
      <PageHeader title={t("settings.title")} subtitle={t("settings.subtitle")} />
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <nav
          aria-label={t("settings.title")}
          className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-card p-2 lg:sticky lg:top-24 lg:w-56 lg:shrink-0 lg:flex-col"
        >
          {sections.map((s) => (
            <button
              key={s.key}
              type="button"
              aria-current={s.key === current.key ? "page" : undefined}
              onClick={() => router.replace(`${pathname}?section=${s.key}`, { scroll: false })}
              className={cn(
                "flex h-10 shrink-0 items-center gap-3 rounded-md px-3 text-start text-sm whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                s.key === current.key
                  ? "bg-sidebar-active text-sidebar-active-text"
                  : "text-text-secondary hover:bg-muted hover:text-text",
              )}
            >
              <s.icon className="size-4 shrink-0" strokeWidth={1.75} />
              {t(`settings.sections.${s.key}`)}
            </button>
          ))}
        </nav>
        <div className="min-w-0 flex-1">
          {isPending ? <Skeleton className="h-96" /> : current.render()}
        </div>
      </div>
    </>
  );
};
