"use client";

import { UserPlus, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { CaseDetail } from "@aml/shared";
import { useAddCaseMember, useEligibleMembers, useRemoveCaseMember } from "@/entities/case";
import { Button } from "@/shared/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

/**
 * Case team. Only members read the discussion (access layer 4); the API lists who may be added,
 * which already respects region and clearance.
 */
export const CaseMembers = ({ detail }: { detail: CaseDetail }) => {
  const { t } = useTranslation();
  const { case: c, members, allowed } = detail;
  const [adding, setAdding] = useState(false);
  const eligible = useEligibleMembers(c.code, adding && allowed.manageMembers);
  const add = useAddCaseMember();
  const remove = useRemoveCaseMember();
  const candidates = (eligible.data ?? []).filter((u) => !members.some((m) => m.id === u.id));

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {members.map((m) => (
          <li key={m.id} className="flex items-center gap-3">
            <span
              className="grid size-8 place-items-center rounded-full bg-brand-soft text-xs text-heading"
              aria-hidden
            >
              {initials(m.name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm">{m.name}</span>
              <span className="text-xs text-text-secondary">
                {t(`role.${m.role}`, { defaultValue: m.role })}
                {m.id === c.createdById ? ` · ${t("caseDetail.creator")}` : ""}
              </span>
            </span>
            {allowed.manageMembers && m.id !== c.createdById ? (
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={t("caseDetail.removeMember", { name: m.name })}
                disabled={remove.isPending}
                onClick={() => remove.mutate({ code: c.code, userId: m.id })}
              >
                <X />
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      {allowed.manageMembers ? (
        adding ? (
          <Select
            onValueChange={(userId) =>
              add.mutate({ code: c.code, userId }, { onSuccess: () => setAdding(false) })
            }
            onOpenChange={(open) => !open && !add.isPending && setAdding(false)}
            defaultOpen
          >
            <SelectTrigger aria-label={t("caseDetail.addMember")}>
              <SelectValue
                placeholder={eligible.isPending ? t("common.loading") : t("caseDetail.pickMember")}
              />
            </SelectTrigger>
            <SelectContent>
              {candidates.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name} · {t(`role.${u.role}`, { defaultValue: u.role })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Button variant="outline" size="sm" className="w-fit" onClick={() => setAdding(true)}>
            <UserPlus /> {t("caseDetail.addMember")}
          </Button>
        )
      ) : null}
    </div>
  );
};
