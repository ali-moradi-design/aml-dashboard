"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useOverview } from "@/entities/overview";
import { useCan } from "@/entities/session";
import { footerNav, navGroups, type NavItem } from "@/shared/config/navigation";
import { useHref, useLocale } from "@/shared/i18n/use-locale";
import { formatNumber } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { LogoMark } from "@/shared/ui/logo-mark";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import { useSidebarStore } from "../model/sidebar-store";

const NavLink = ({ item, active, collapsed, count }: { item: NavItem; active: boolean; collapsed: boolean; count?: number }) => {
  const { t } = useTranslation();
  const href = useHref();
  const locale = useLocale();
  const Icon = item.icon;
  const link = (
    <Link
      href={href(item.path)}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-10 items-center gap-3 overflow-hidden rounded-md px-2.5 whitespace-nowrap transition-[background-color,color,padding] duration-200 ease-out",
        active ? "bg-sidebar-active text-sidebar-active-text" : "text-text-secondary hover:bg-sidebar-hover hover:text-text",
        !collapsed && !active && "hover:ps-3.5",
      )}
    >
      {active ? <span className="absolute start-0 top-2.5 h-5 w-[3px] rounded-full bg-sidebar-indicator" aria-hidden /> : null}
      <Icon className={cn("size-5 shrink-0", active && "text-sidebar-indicator dark:text-sidebar-active-text")} strokeWidth={1.75} />
      <span className={cn("flex-1 transition-opacity duration-150", collapsed && "opacity-0")}>{t(`nav.${item.key}`)}</span>
      {count ? (
        <span
          className={cn(
            "rounded-full px-2 py-px text-xs transition-opacity duration-150",
            active ? "bg-sidebar-indicator text-card dark:bg-card dark:text-sidebar-active" : "bg-muted text-text",
            collapsed && "opacity-0",
          )}
        >
          {formatNumber(count, locale)}
        </span>
      ) : null}
    </Link>
  );
  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{t(`nav.${item.key}`)}</TooltipContent>
    </Tooltip>
  );
};

/** Expanded 248px, collapsed 72px. Every row keeps its height in both states, so nothing jumps. */
export const Sidebar = () => {
  const { t } = useTranslation();
  const pathname = usePathname();
  const locale = useLocale();
  const can = useCan();
  const { collapsed, toggle } = useSidebarStore();
  const { data: overview } = useOverview();
  const counts: Record<string, number | undefined> = { alerts: overview?.kpis.openAlerts };
  const isActive = (path: string) => {
    const rest = (pathname ?? "").replace(`/${locale}`, "") || "/";
    return path === "/" ? rest === "/" : rest.startsWith(path);
  };

  return (
    <aside
      className={cn(
        "sticky top-0 z-20 flex h-dvh shrink-0 flex-col gap-1 border-e border-sidebar-border bg-sidebar px-4 py-5 transition-[width] duration-250 ease-in-out",
        collapsed ? "w-[72px]" : "w-[248px]",
      )}
    >
      <button
        type="button"
        onClick={toggle}
        aria-label={t(collapsed ? "sidebar.expand" : "sidebar.collapse")}
        className="absolute -end-3 top-7 grid size-6 place-items-center rounded-full border border-sidebar-border bg-sidebar text-text-secondary transition-colors hover:text-text"
      >
        <ChevronLeft className={cn("size-3.5 transition-transform duration-250 rtl:rotate-180", collapsed && "rotate-180 rtl:rotate-0")} />
      </button>

      <div className="flex h-10 items-center gap-2.5 overflow-hidden whitespace-nowrap">
        <LogoMark />
        <div className={cn("transition-opacity duration-150", collapsed && "opacity-0")}>
          <p className="text-base text-text">{t("app.name")}</p>
          <p className="text-xs text-text-secondary">{t("app.tagline")}</p>
        </div>
      </div>
      <div className="h-5" />

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden">
        {navGroups.map((group) => {
          const items = group.items.filter((i) => can(i.permission));
          if (!items.length) return null;
          return (
            <div key={group.key} className="flex flex-col gap-1 pb-3">
              <div className="relative flex h-7 items-center ps-3 text-xs whitespace-nowrap text-text-secondary">
                <span className={cn("transition-opacity duration-150", collapsed && "opacity-0")}>{t(`navGroup.${group.key}`)}</span>
                <span className={cn("absolute start-3 h-px w-4 bg-sidebar-border opacity-0 transition-opacity", collapsed && "opacity-100")} />
              </div>
              {items.map((item) => (
                <NavLink key={item.key} item={item} active={isActive(item.path)} collapsed={collapsed} count={counts[item.key]} />
              ))}
            </div>
          );
        })}
      </nav>

      {footerNav.map((item) => (
        <NavLink key={item.key} item={item} active={isActive(item.path)} collapsed={collapsed} />
      ))}
    </aside>
  );
};
