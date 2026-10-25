"use client";

import { Lock, Pencil, Plus, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { permissions, roleKeys, type AdminReference, type RoleKey } from "@aml/shared";
import {
  auditQueryOptions,
  useAdminUsers,
  useRenameClearance,
  useSaveRolePermissions,
} from "@/entities/admin";
import { useMe } from "@/entities/session";
import { isHttpError } from "@/shared/api";
import { useLocale } from "@/shared/i18n/use-locale";
import { formatDateTime, formatNumber, formatRelative } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { DataTable, type DataColumn } from "@/shared/ui/data-table";
import { Input } from "@/shared/ui/input";
import { Note, Panel, PanelHeader } from "@/shared/ui/panel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";
import { BranchDialog } from "./branch-dialog";
import { UserDialog } from "./user-dialog";

const th = "h-9 border-b border-border px-3 text-start text-xs font-normal text-text-secondary";
const td = "border-b border-border px-3 py-2.5";

export const UsersSection = ({ reference }: { reference: AdminReference }) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const { data, isPending } = useAdminUsers();
  const regionName = new Map(
    reference.regions.map((r) => [r.id, t(`region.${r.code}`, { defaultValue: r.name })]),
  );
  const inactive = (data ?? []).filter((u) => !u.active).length;

  return (
    <Panel>
      <PanelHeader
        eyebrow={t("admin.users.eyebrow")}
        title={
          data
            ? t("admin.users.insight", {
                count: data.length,
                n: formatNumber(data.length, locale),
                inactive: formatNumber(inactive, locale),
              })
            : undefined
        }
        actions={
          <UserDialog
            reference={reference}
            trigger={
              <Button>
                <UserPlus /> {t("admin.users.new")}
              </Button>
            }
          />
        }
      />
      {isPending ? <Skeleton className="h-60" /> : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-215 text-[13px]">
          <thead>
            <tr>
              {["name", "role", "regions", "clearance", "lastLogin", "status", "actions"].map(
                (c) => (
                  <th key={c} className={th}>
                    {c === "actions" ? (
                      <span className="sr-only">{t("admin.users.actions")}</span>
                    ) : (
                      t(`admin.users.col.${c}`)
                    )}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((u) => (
              <tr key={u.id} className={cn(!u.active && "text-text-secondary")}>
                <td className={td}>
                  <p>{u.name}</p>
                  <p className="text-xs text-text-secondary" dir="ltr">
                    {u.email}
                  </p>
                </td>
                <td className={td}>{t(`role.${u.role}`)}</td>
                <td className={td}>
                  {u.regionIds.map((id) => regionName.get(id) ?? id).join(", ")}
                </td>
                <td className={td}>
                  {formatNumber(u.clearanceRank, locale)} ·{" "}
                  {reference.clearanceLevels.find((l) => l.rank === u.clearanceRank)?.name}
                </td>
                <td className={td}>
                  {u.lastLoginAt ? (
                    <time dateTime={u.lastLoginAt} title={formatDateTime(u.lastLoginAt, locale)}>
                      {formatRelative(u.lastLoginAt, locale)}
                    </time>
                  ) : (
                    t("admin.users.never")
                  )}
                </td>
                <td className={td}>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs",
                      u.active
                        ? "bg-risk-low-bg text-risk-low-text"
                        : "bg-muted text-text-secondary",
                    )}
                  >
                    {t(u.active ? "admin.users.activeBadge" : "admin.users.disabled")}
                  </span>
                </td>
                <td className={cn(td, "text-end")}>
                  <UserDialog
                    user={u}
                    reference={reference}
                    trigger={
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={t("admin.users.editTitle", { name: u.name })}
                      >
                        <Pencil /> {t("admin.edit")}
                      </Button>
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
};

/** Roles × permissions. Each column saves on its own; the admin role always keeps admin rights. */
export const RolesSection = ({ reference }: { reference: AdminReference }) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const { data: me } = useMe();
  const save = useSaveRolePermissions();
  const initial = useMemo(
    () =>
      Object.fromEntries(reference.roles.map((r) => [r.key, new Set(r.permissions)])) as Record<
        RoleKey,
        Set<string>
      >,
    [reference],
  );
  const [draft, setDraft] = useState(initial);
  const [lastRef, setLastRef] = useState(reference);
  if (lastRef !== reference) {
    setLastRef(reference);
    setDraft(initial);
  }
  const dirty = (role: RoleKey) =>
    draft[role].size !== initial[role].size || [...draft[role]].some((p) => !initial[role].has(p));
  const locked = (role: RoleKey, p: string) =>
    (role === "ADMIN" && p === "admin.manage") || (me?.role === role && role !== "ADMIN");
  const toggle = (role: RoleKey, p: string) =>
    setDraft((d) => {
      const next = new Set(d[role]);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return { ...d, [role]: next };
    });

  return (
    <Panel>
      <PanelHeader eyebrow={t("admin.roles.eyebrow")} title={t("admin.roles.title")} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-190 text-[13px]">
          <thead>
            <tr>
              <th className={th}>{t("admin.roles.permission")}</th>
              {reference.roles.map((r) => (
                <th key={r.key} className={cn(th, "text-center")}>
                  <span className="block text-text">{t(`role.${r.key}`)}</span>
                  <span className="block">
                    {t("admin.roles.users", { count: r.users, n: formatNumber(r.users, locale) })}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {permissions.map((p) => (
              <tr key={p} className="hover:bg-muted">
                <td className={td}>
                  <p>{t(`admin.permissions.${p.replace(".", "_")}`)}</p>
                  <p className="font-mono text-xs text-text-secondary" dir="ltr">
                    {p}
                  </p>
                </td>
                {reference.roles.map((r) => (
                  <td key={r.key} className={cn(td, "text-center")}>
                    <span className="inline-flex items-center gap-1">
                      <Checkbox
                        checked={draft[r.key].has(p)}
                        disabled={locked(r.key, p)}
                        onCheckedChange={() => toggle(r.key, p)}
                        aria-label={`${t(`role.${r.key}`)}: ${p}`}
                      />
                      {locked(r.key, p) ? (
                        <Lock className="size-3 text-text-secondary" aria-hidden />
                      ) : null}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td className="px-3 pt-4 text-xs text-text-secondary">{t("admin.roles.saveHint")}</td>
              {roleKeys.map((role) => (
                <td key={role} className="px-3 pt-4 text-center">
                  <Button
                    size="sm"
                    disabled={!dirty(role) || save.isPending}
                    onClick={() => save.mutate({ role, permissions: [...draft[role]] })}
                  >
                    {t("forms.save")}
                  </Button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      {isHttpError(save.error) && save.error.status === 403 ? (
        <Note tone="danger">{t("admin.roles.ownRole")}</Note>
      ) : null}
      <Note>{t("admin.roles.note")}</Note>
    </Panel>
  );
};

export const BranchesSection = ({ reference }: { reference: AdminReference }) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const branches = reference.regions.flatMap((r) => r.branches);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-text-secondary">
        {t("admin.branches.insight", {
          regions: formatNumber(reference.regions.length, locale),
          branches: formatNumber(branches.length, locale),
        })}
      </p>
      {reference.regions.map((region) => (
        <Panel key={region.id}>
          <PanelHeader
            eyebrow={t("admin.branches.region")}
            title={`${t(`region.${region.code}`, { defaultValue: region.name })} (${region.code})`}
            actions={
              <BranchDialog
                regionId={region.id}
                reference={reference}
                trigger={
                  <Button variant="outline" size="sm">
                    <Plus /> {t("admin.branches.new")}
                  </Button>
                }
              />
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-160 text-[13px]">
              <thead>
                <tr>
                  {["code", "city", "country", "timezone", "customers", "actions"].map((c) => (
                    <th key={c} className={th}>
                      {c === "actions" ? (
                        <span className="sr-only">{t("admin.users.actions")}</span>
                      ) : (
                        t(`admin.branches.${c}`)
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {region.branches.map((b) => (
                  <tr key={b.id}>
                    <td className={cn(td, "font-mono")}>{b.code}</td>
                    <td className={td}>{t(`city.${b.city}`, { defaultValue: b.city })}</td>
                    <td className={td}>{t(`country.${b.country}`, { defaultValue: b.country })}</td>
                    <td className={cn(td, "text-text-secondary")} dir="ltr">
                      {b.timezone}
                    </td>
                    <td className={td}>{formatNumber(b.customers, locale)}</td>
                    <td className={cn(td, "text-end")}>
                      <BranchDialog
                        branch={b}
                        regionId={region.id}
                        reference={reference}
                        trigger={
                          <Button variant="ghost" size="sm">
                            <Pencil /> {t("admin.edit")}
                          </Button>
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ))}
    </div>
  );
};

const ClearanceRow = ({ level }: { level: AdminReference["clearanceLevels"][number] }) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const rename = useRenameClearance();
  const [name, setName] = useState(level.name);
  const invalid = name.trim().length < 2;
  return (
    <li className="flex flex-wrap items-center gap-3 border-b border-border py-3 last:border-b-0">
      <span className="grid size-9 place-items-center rounded-full bg-brand-soft text-heading">
        {formatNumber(level.rank, locale)}
      </span>
      <label className="sr-only" htmlFor={`clearance-${level.rank}`}>
        {t("admin.clearance.name", { rank: level.rank })}
      </label>
      <Input
        id={`clearance-${level.rank}`}
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-invalid={invalid}
        className="max-w-xs"
      />
      <Button
        size="sm"
        variant="outline"
        disabled={invalid || name.trim() === level.name || rename.isPending}
        onClick={() => rename.mutate({ rank: level.rank, name: name.trim() })}
      >
        {t("forms.save")}
      </Button>
      {invalid ? <span className="text-xs text-risk-high-text">{t("errors.required")}</span> : null}
    </li>
  );
};

export const ClearanceSection = ({ reference }: { reference: AdminReference }) => {
  const { t } = useTranslation();
  return (
    <Panel>
      <PanelHeader eyebrow={t("admin.clearance.eyebrow")} title={t("admin.clearance.title")} />
      <ul>
        {reference.clearanceLevels.map((l) => (
          <ClearanceRow key={`${l.rank}-${l.name}`} level={l} />
        ))}
      </ul>
      <Note>{t("admin.clearance.note")}</Note>
    </Panel>
  );
};

type AuditRow = {
  id: string;
  userName: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  data: unknown;
  createdAt: string;
};
const ENTITIES = [
  "user",
  "role",
  "branch",
  "clearance",
  "settings",
  "case",
  "alert",
  "customer",
  "rule",
  "workflow",
  "news",
  "import",
  "job",
];

export const AuditSection = () => {
  const { t } = useTranslation();
  const locale = useLocale();
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("any");
  const [count, setCount] = useState<number | null>(null);
  const filters = useMemo(
    () => ({
      ...(action.trim() ? { action: action.trim() } : {}),
      ...(entity !== "any" ? { entity } : {}),
    }),
    [action, entity],
  );

  const columns = useMemo<Array<DataColumn<AuditRow>>>(
    () => [
      {
        accessorKey: "createdAt",
        header: t("admin.audit.when"),
        size: 170,
        cell: ({ row }) => formatDateTime(row.original.createdAt, locale),
      },
      {
        accessorKey: "userName",
        header: t("admin.audit.user"),
        size: 160,
        enableSorting: false,
        cell: ({ row }) => row.original.userName ?? t("admin.audit.system"),
      },
      {
        accessorKey: "action",
        header: t("admin.audit.action"),
        size: 190,
        enableSorting: false,
        meta: { className: "font-mono text-xs" },
      },
      { accessorKey: "entity", header: t("admin.audit.entity"), size: 110, enableSorting: false },
      {
        accessorKey: "data",
        header: t("admin.audit.details"),
        size: 260,
        enableSorting: false,
        meta: { grow: true, className: "font-mono text-xs text-text-secondary" },
        cell: ({ row }) => (row.original.data ? JSON.stringify(row.original.data) : ""),
      },
    ],
    [t, locale],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4">
        <label className="sr-only" htmlFor="audit-action">
          {t("admin.audit.action")}
        </label>
        <Input
          id="audit-action"
          dir="ltr"
          placeholder={t("admin.audit.actionPlaceholder")}
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="w-64 font-mono"
        />
        <Select value={entity} onValueChange={setEntity}>
          <SelectTrigger className="w-48" aria-label={t("admin.audit.entity")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">{t("admin.audit.anyEntity")}</SelectItem>
            {ENTITIES.map((e) => (
              <SelectItem key={e} value={e}>
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {count !== null ? (
          <span className="text-sm text-text-secondary">
            {t("admin.audit.count", { count, n: formatNumber(count, locale) })}
          </span>
        ) : null}
      </div>
      <DataTable<AuditRow>
        label={t("admin.sections.audit")}
        className="h-[calc(100dvh-340px)] min-h-105"
        columns={columns}
        query={(req) => auditQueryOptions({ ...req, filters })}
        resetKey={filters}
        initialSort={[{ id: "createdAt", desc: true }]}
        getRowId={(r) => r.id}
        onCount={setCount}
      />
    </div>
  );
};
