"use client";

import { PaletteTrigger } from "@/features/command-palette";
import { LanguageSwitch } from "@/features/language-switch";
import { NotificationBell } from "@/features/notification-bell";
import { ThemeToggle } from "@/features/theme-toggle";
import { UserMenu } from "@/features/user-menu";

/**
 * Plain 64px app bar (decided with the author): search (opens the command palette), theme,
 * language, notifications, user. On narrow screens the search box shrinks and the user's name
 * hides, so the bar never overflows.
 */
export const AppBar = () => (
  <header className="sticky top-0 z-10 flex h-16 items-center gap-2 border-b border-border bg-card px-4 md:gap-3 md:px-6 xl:px-8 print:hidden">
    <PaletteTrigger className="min-w-10 flex-1 lg:w-100 lg:flex-none" />
    <div className="hidden flex-1 lg:block" />
    {/* Also in Settings → Appearance, so phones can drop it from the bar. */}
    <div className="hidden sm:block">
      <ThemeToggle />
    </div>
    <LanguageSwitch />
    <NotificationBell />
    <span className="hidden h-7 w-px bg-border sm:block" aria-hidden />
    <UserMenu />
  </header>
);
