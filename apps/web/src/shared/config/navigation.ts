import {
  ArrowLeftRight, BookOpenCheck, CalendarClock, FileText, Folder, HelpCircle, Home, Inbox, Megaphone, Settings,
  Share2, ShieldCheck, TriangleAlert, Upload, Users, Workflow, type LucideIcon,
} from "lucide-react";
import type { Permission } from "@aml/shared";

export type NavItem = {
  key: string;
  path: string;
  icon: LucideIcon;
  permission: Permission;
  /** Release that delivers the screen; earlier releases show a "coming soon" page. */
  release: number;
};

export const navGroups: Array<{ key: string; items: NavItem[] }> = [
  {
    key: "monitoring",
    items: [
      { key: "overview", path: "/", icon: Home, permission: "overview.view", release: 1 },
      { key: "alerts", path: "/alerts", icon: TriangleAlert, permission: "alerts.view", release: 1 },
      { key: "cases", path: "/cases", icon: Folder, permission: "cases.view", release: 2 },
      { key: "transactions", path: "/transactions", icon: ArrowLeftRight, permission: "transactions.view", release: 1 },
      { key: "customers", path: "/customers", icon: Users, permission: "customers.view", release: 2 },
      { key: "network", path: "/network", icon: Share2, permission: "customers.view", release: 3 },
    ],
  },
  {
    key: "workspace",
    items: [
      { key: "myWork", path: "/my-work", icon: Inbox, permission: "cases.view", release: 3 },
      { key: "reports", path: "/reports", icon: FileText, permission: "reports.view", release: 4 },
      { key: "news", path: "/news", icon: Megaphone, permission: "overview.view", release: 4 },
    ],
  },
  {
    key: "configuration",
    items: [
      { key: "rules", path: "/rules", icon: BookOpenCheck, permission: "rules.view", release: 2 },
      { key: "jobs", path: "/jobs", icon: CalendarClock, permission: "jobs.manage", release: 4 },
      { key: "import", path: "/import", icon: Upload, permission: "import.manage", release: 4 },
      { key: "workflow", path: "/workflow", icon: Workflow, permission: "workflow.manage", release: 3 },
      { key: "admin", path: "/admin", icon: ShieldCheck, permission: "admin.manage", release: 4 },
    ],
  },
];

export const footerNav: NavItem[] = [
  { key: "help", path: "/help", icon: HelpCircle, permission: "overview.view", release: 4 },
  { key: "settings", path: "/settings", icon: Settings, permission: "overview.view", release: 4 },
];

/** Sections that render the "coming soon" page until their release ships. */
export const upcomingSections = [...navGroups.flatMap((g) => g.items), ...footerNav].filter((i) => i.release > 1);
