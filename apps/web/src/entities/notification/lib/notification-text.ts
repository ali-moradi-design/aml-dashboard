"use client";

import { AtSign, Bell, Clock, FileCheck2, Folder, Megaphone, ShieldAlert, TriangleAlert, type LucideIcon } from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { AppNotification, NotificationType } from "@aml/shared";
import { useHref } from "@/shared/i18n/use-locale";

const ICONS: Record<NotificationType, LucideIcon> = {
  mention: AtSign, case_step: Folder, case_assigned: Folder, news: Megaphone, job_failed: TriangleAlert, kyc_expiry: ShieldAlert, sla_breach: Clock, import_done: FileCheck2,
};

/** Text, link and icon for a notification, built from its type and data. */
export const useNotificationText = () => {
  const { t } = useTranslation();
  const href = useHref();
  return useCallback(
    (n: AppNotification) => {
      const d = n.data;
      const link =
        n.type === "news" ? (d.id ? `/news/${d.id}` : "/news")
        : n.type === "job_failed" ? "/jobs"
        : n.type === "kyc_expiry" ? "/customers"
        : n.type === "import_done" ? "/import"
        : d.code ? `/cases/${d.code}` : "/my-work";
      return { text: t(`notifications.text.${n.type}`, { ...d, defaultValue: n.type }), href: href(link), Icon: ICONS[n.type] ?? Bell };
    },
    [t, href],
  );
};
