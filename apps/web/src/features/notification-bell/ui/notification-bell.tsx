"use client";

import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AppNotification } from "@aml/shared";
import { useLatestNotifications, useMarkRead, useNotificationsLive, useNotificationText } from "@/entities/notification";
import { useHref, useLocale } from "@/shared/i18n/use-locale";
import { formatNumber, formatRelative } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";

/** Bell with the unread count; new notifications arrive over the socket and are announced to screen readers. */
export const NotificationBell = () => {
  const { t } = useTranslation();
  const locale = useLocale();
  const href = useHref();
  const textOf = useNotificationText();
  const { data } = useLatestNotifications();
  const markRead = useMarkRead();
  const [open, setOpen] = useState(false);
  const [announce, setAnnounce] = useState("");
  const onNew = useCallback((n: AppNotification) => setAnnounce(textOf(n).text), [textOf]);
  useNotificationsLive(onNew);
  const unread = data?.unread ?? 0;

  return (
    <>
      <span className="sr-only" aria-live="polite">{announce}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          aria-label={unread ? t("notifications.bellUnread", { count: unread }) : t("appBar.notifications")}
          className="relative grid size-10 place-items-center rounded-md border border-border bg-muted text-text outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Bell className="size-[18px]" strokeWidth={1.75} />
          {unread ? (
            <span className="absolute -end-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-risk-high px-1 text-[10px] text-white" aria-hidden>
              {unread > 9 ? "9+" : formatNumber(unread, locale)}
            </span>
          ) : null}
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[360px] p-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-text">{t("appBar.notifications")}</p>
            <Button variant="ghost" size="sm" disabled={!unread || markRead.isPending} onClick={() => markRead.mutate({ all: true })}>
              <CheckCheck /> {t("notifications.markAll")}
            </Button>
          </div>
          <ul className="max-h-[380px] overflow-auto">
            {(data?.items ?? []).slice(0, 8).map((n) => {
              const { text, href: link, Icon } = textOf(n);
              return (
                <li key={n.id}>
                  <Link
                    href={link}
                    onClick={() => { setOpen(false); if (!n.readAt) markRead.mutate({ ids: [n.id] }); }}
                    className={cn("flex gap-3 px-4 py-3 text-sm hover:bg-muted", !n.readAt && "bg-brand-soft/40")}
                  >
                    <Icon className="mt-0.5 size-4 shrink-0 text-text-secondary" />
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2">{text}</span>
                      <span className="text-xs text-text-secondary">{formatRelative(n.createdAt, locale)}</span>
                    </span>
                    {!n.readAt ? <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" aria-label={t("notifications.unread")} /> : null}
                  </Link>
                </li>
              );
            })}
            {data && !data.items.length ? <li className="px-4 py-6 text-center text-sm text-text-secondary">{t("notifications.empty")}</li> : null}
          </ul>
          <Link href={href("/notifications")} onClick={() => setOpen(false)} className="block border-t border-border px-4 py-2.5 text-center text-sm text-link hover:underline">
            {t("notifications.seeAll")}
          </Link>
        </PopoverContent>
      </Popover>
    </>
  );
};
