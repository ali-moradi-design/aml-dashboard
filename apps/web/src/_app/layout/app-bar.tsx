"use client";

import { PaletteTrigger } from "@/features/command-palette";
import { LanguageSwitch } from "@/features/language-switch";
import { NotificationBell } from "@/features/notification-bell";
import { ThemeToggle } from "@/features/theme-toggle";
import { UserMenu } from "@/features/user-menu";

/** Plain 64px app bar (decided with the author): search (opens the command palette), theme, language, notifications, user. */
export const AppBar = () => (
  <header className="sticky top-0 z-10 flex h-16 print:hidden items-center gap-3 border-b border-border bg-card px-8">
    <PaletteTrigger />
    <div className="flex-1" />
    <ThemeToggle />
    <LanguageSwitch />
    <NotificationBell />
    <span className="h-7 w-px bg-border" aria-hidden />
    <UserMenu />
  </header>
);
