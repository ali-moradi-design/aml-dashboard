"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useMe } from "@/entities/session";
import { isHttpError } from "@/shared/api";
import { useHref } from "@/shared/i18n/use-locale";
import { Skeleton } from "@/shared/ui/skeleton";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { AppBar } from "./app-bar";
import { Sidebar } from "./sidebar";

/** Signed-in layout. The session is checked by the API; a 401 sends the user to the login page. */
export const AppLayout = ({ children }: { children: ReactNode }) => {
  const { isPending, error } = useMe();
  const router = useRouter();
  const pathname = usePathname();
  const href = useHref();
  const unauthorized = isHttpError(error) && error.status === 401;

  useEffect(() => {
    if (unauthorized) router.replace(`${href("/login")}?next=${encodeURIComponent(pathname ?? "")}`);
  }, [unauthorized, router, href, pathname]);

  if (isPending || unauthorized) {
    return (
      <div className="flex min-h-dvh">
        <div className="w-[248px] border-e border-border bg-card" />
        <div className="flex-1 space-y-6 p-8">
          <Skeleton className="h-10 w-80" />
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex min-h-dvh">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <AppBar />
          <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-8 pt-7 pb-10">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
};
