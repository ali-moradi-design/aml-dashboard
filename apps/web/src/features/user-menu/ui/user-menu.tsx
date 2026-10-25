"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLogout, useMe } from "@/entities/session";
import { useMySettings } from "@/entities/settings";
import { apiUrl } from "@/shared/api";
import { useHref } from "@/shared/i18n/use-locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

export const UserMenu = () => {
  const { t } = useTranslation();
  const { data: me } = useMe();
  const avatarUrl = useMySettings().data?.profile.avatarUrl;
  const logout = useLogout();
  const router = useRouter();
  const href = useHref();
  if (!me) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-md p-1 text-start outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- served by the API with the session cookie
          <img src={apiUrl(avatarUrl)} alt="" className="size-9 rounded-full object-cover" />
        ) : (
          <span className="grid size-9 place-items-center rounded-full bg-brand-soft text-xs text-heading dark:bg-brand dark:text-on-brand">
            {initials(me.name)}
          </span>
        )}
        <span className="hidden max-w-56 xl:block">
          <span className="block truncate text-text">{me.name}</span>
          <span className="block truncate text-xs text-text-secondary">
            {t(`role.${me.role}`)} · {me.regions.map((r) => r.name).join(", ")}
          </span>
        </span>
        <ChevronDown className="hidden size-4 text-text-secondary sm:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <p className="text-text">{me.name}</p>
          <p className="text-xs text-text-secondary">{me.email}</p>
          <p className="mt-1 text-xs text-text-secondary">
            {t("user.clearance", { rank: me.clearanceRank })}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={href("/settings")}>
            <Settings className="size-4" /> {t("nav.settings")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            logout.mutate(undefined, { onSettled: () => router.replace(href("/login")) })
          }
          className="text-risk-high-text focus:text-risk-high-text"
        >
          <LogOut className="size-4" /> {t("user.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
