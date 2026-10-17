"use client";

import Link from "next/link";
import { CheckCheck } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { notificationTypes, type NotificationType } from "@aml/shared";
import { useMarkRead, useNotificationList, useNotificationText } from "@/entities/notification";
import { useLocale } from "@/shared/i18n/use-locale";
import { formatDateTime, formatNumber, formatRelative } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { PageHeader, Panel } from "@/shared/ui/panel";
import { Segmented } from "@/shared/ui/segmented";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";

export const NotificationsPage = () => {
  const { t } = useTranslation();
  const locale = useLocale();
  const textOf = useNotificationText();
  const [show, setShow] = useState<"all" | "unread">("all");
  const [type, setType] = useState<NotificationType | "any">("any");
  const list = useNotificationList({ unread: show === "unread", type: type === "any" ? undefined : type });
  const markRead = useMarkRead();
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const unread = list.data?.pages[0]?.unread ?? 0;

  return (
    <>
      <PageHeader
        title={t("notifications.title")}
        subtitle={t("notifications.subtitle", { count: unread, n: formatNumber(unread, locale) })}
        actions={<Button variant="outline" disabled={!unread || markRead.isPending} onClick={() => markRead.mutate({ all: true })}><CheckCheck /> {t("notifications.markAll")}</Button>}
      />
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4">
        <Segmented label={t("notifications.show")} value={show} onChange={setShow} options={[{ value: "all", label: t("notifications.all") }, { value: "unread", label: t("notifications.unreadOnly") }]} />
        <Select value={type} onValueChange={(v) => setType(v as NotificationType | "any")}>
          <SelectTrigger className="w-56" aria-label={t("notifications.type")}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="any">{t("notifications.anyType")}</SelectItem>
            {notificationTypes.map((x) => <SelectItem key={x} value={x}>{t(`notifications.types.${x}`)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Panel className="gap-0 p-0">
        {list.isPending ? <Skeleton className="m-6 h-40" /> : null}
        <ul className="divide-y divide-border">
          {items.map((n) => {
            const { text, href, Icon } = textOf(n);
            return (
              <li key={n.id} className={cn("flex items-start gap-3 px-6 py-4", !n.readAt && "bg-brand-soft/30")}>
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted"><Icon className="size-4 text-text-secondary" /></span>
                <div className="min-w-0 flex-1">
                  <Link href={href} onClick={() => !n.readAt && markRead.mutate({ ids: [n.id] })} className="text-sm hover:underline">{text}</Link>
                  <p className="text-xs text-text-secondary">
                    {t(`notifications.types.${n.type}`)} · <time dateTime={n.createdAt} title={formatDateTime(n.createdAt, locale)}>{formatRelative(n.createdAt, locale)}</time>
                  </p>
                </div>
                {!n.readAt ? <Button variant="ghost" size="sm" onClick={() => markRead.mutate({ ids: [n.id] })}>{t("notifications.markRead")}</Button> : null}
              </li>
            );
          })}
        </ul>
        {list.isSuccess && !items.length ? <p className="p-10 text-center text-text-secondary">{t("notifications.empty")}</p> : null}
        {list.hasNextPage ? (
          <div className="border-t border-border p-4 text-center">
            <Button variant="outline" disabled={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()}>{list.isFetchingNextPage ? t("common.loading") : t("notifications.more")}</Button>
          </div>
        ) : null}
      </Panel>
    </>
  );
};
