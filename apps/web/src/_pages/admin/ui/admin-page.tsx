"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAdminReference } from "@/entities/admin";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { PageHeader, Panel } from "@/shared/ui/panel";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  AuditSection,
  BranchesSection,
  ClearanceSection,
  RolesSection,
  UsersSection,
} from "./admin-sections";

const TABS = ["users", "roles", "branches", "clearance", "audit"] as const;
type Tab = (typeof TABS)[number];

export const AdminPage = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab: Tab = (TABS as readonly string[]).includes(params?.get("tab") ?? "")
    ? (params!.get("tab") as Tab)
    : "users";
  const { data: reference, isPending, isError, refetch } = useAdminReference();

  return (
    <>
      <PageHeader title={t("admin.title")} subtitle={t("admin.subtitle")} />
      <div
        role="tablist"
        aria-label={t("admin.title")}
        className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-border"
      >
        {TABS.map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => router.replace(`${pathname}?tab=${k}`, { scroll: false })}
            className={cn(
              "-mb-px h-10 shrink-0 border-b-2 px-4 text-sm whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              tab === k
                ? "border-brand text-heading dark:border-sidebar-indicator"
                : "border-transparent text-text-secondary hover:text-text",
            )}
          >
            {t(`admin.sections.${k}`)}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {tab === "audit" ? (
          <AuditSection />
        ) : isError ? (
          <Panel>
            <p>{t("errors.generic")}</p>
            <Button variant="outline" className="w-fit" onClick={() => refetch()}>
              {t("errors.retry")}
            </Button>
          </Panel>
        ) : isPending ? (
          <Skeleton className="h-96" />
        ) : tab === "users" ? (
          <UsersSection reference={reference} />
        ) : tab === "roles" ? (
          <RolesSection reference={reference} />
        ) : tab === "branches" ? (
          <BranchesSection reference={reference} />
        ) : (
          <ClearanceSection reference={reference} />
        )}
      </div>
    </>
  );
};
