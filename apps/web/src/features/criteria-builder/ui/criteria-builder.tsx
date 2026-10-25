"use client";

import { FolderPlus, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  criteriaFields,
  operatorsByType,
  type Condition,
  type CriteriaField,
  type CriteriaGroup,
  type Operator,
} from "@aml/shared";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import {
  appendAt,
  defaultValue,
  newCondition,
  newGroup,
  removeAt,
  updateAt,
  type Path,
} from "../model/tree";

type Props = { value: CriteriaGroup; onChange: (next: CriteriaGroup) => void; maxDepth?: number };

const ValueInput = ({
  condition,
  onChange,
}: {
  condition: Condition;
  onChange: (v: Condition["value"]) => void;
}) => {
  const { t } = useTranslation();
  const def = criteriaFields[condition.field];
  const { operator, value } = condition;

  if (operator === "between") {
    const [a, b] = (Array.isArray(value) ? value : ["", ""]) as [string | number, string | number];
    const type = def.type === "date" ? "date" : "number";
    const cast = (v: string) => (type === "number" ? Number(v) : v);
    return (
      <div className="flex items-center gap-2" dir="ltr">
        <Input
          type={type}
          value={String(a)}
          onChange={(e) => onChange([cast(e.target.value), b] as never)}
          className="w-36"
          aria-label={t("criteria.from")}
        />
        <span className="text-text-secondary">–</span>
        <Input
          type={type}
          value={String(b)}
          onChange={(e) => onChange([a, cast(e.target.value)] as never)}
          className="w-36"
          aria-label={t("criteria.to")}
        />
      </div>
    );
  }
  if (operator === "in") {
    const list = Array.isArray(value) ? value.join(", ") : String(value);
    return (
      <Input
        value={list}
        onChange={(e) =>
          onChange(
            e.target.value
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          )
        }
        placeholder={t("criteria.listHint")}
        className="w-60"
        dir="ltr"
      />
    );
  }
  if (def.type === "enum") {
    return (
      <Select value={String(value)} onValueChange={onChange}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(def as { options: readonly string[] }).options.map((o) => (
            <SelectItem key={o} value={o}>
              {t(`criteria.enum.${o}`, { defaultValue: o })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  const type = def.type === "number" ? "number" : def.type === "date" ? "date" : "text";
  return (
    <Input
      type={type}
      value={String(value)}
      onChange={(e) => onChange(type === "number" ? Number(e.target.value) : e.target.value)}
      className="w-48"
      dir={type === "text" ? undefined : "ltr"}
    />
  );
};

const ConditionRow = ({
  condition,
  onChange,
  onRemove,
}: {
  condition: Condition;
  onChange: (c: Condition) => void;
  onRemove: () => void;
}) => {
  const { t } = useTranslation();
  const ops = operatorsByType[criteriaFields[condition.field].type] as readonly Operator[];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={condition.field}
        onValueChange={(field: CriteriaField) => onChange(newCondition(field))}
      >
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(criteriaFields) as CriteriaField[]).map((f) => (
            <SelectItem key={f} value={f}>
              {t(`criteria.field.${f}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={condition.operator}
        onValueChange={(operator: Operator) =>
          onChange({ ...condition, operator, value: defaultValue(condition.field, operator) })
        }
      >
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ops.map((o) => (
            <SelectItem key={o} value={o}>
              {t(`criteria.op.${o}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <ValueInput condition={condition} onChange={(value) => onChange({ ...condition, value })} />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        aria-label={t("criteria.remove")}
      >
        <Trash2 />
      </Button>
    </div>
  );
};

const GroupBox = ({
  group,
  path,
  root,
  onChange,
  depth,
  maxDepth,
}: {
  group: CriteriaGroup;
  path: Path;
  root: CriteriaGroup;
  onChange: (g: CriteriaGroup) => void;
  depth: number;
  maxDepth: number;
}) => {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-md border border-border p-3",
        depth > 0 && "bg-muted/60",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div role="radiogroup" className="flex rounded-md border border-border bg-card p-0.5">
          {(["and", "or"] as const).map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={group.combinator === c}
              onClick={() =>
                onChange(updateAt(root, path, (g) => ({ ...(g as CriteriaGroup), combinator: c })))
              }
              className={cn(
                "rounded-sm px-3 py-1 text-xs uppercase",
                group.combinator === c
                  ? "bg-brand text-on-brand"
                  : "text-text-secondary hover:text-text",
              )}
            >
              {t(`criteria.combinator.${c}`)}
            </button>
          ))}
        </div>
        <span className="text-xs text-text-secondary">
          {t(`criteria.combinatorHint.${group.combinator}`)}
        </span>
        {depth > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ms-auto"
            onClick={() => onChange(removeAt(root, path))}
          >
            <Trash2 /> {t("criteria.removeGroup")}
          </Button>
        ) : null}
      </div>
      {group.children.map((child, i) =>
        child.kind === "group" ? (
          <GroupBox
            key={i}
            group={child}
            path={[...path, i]}
            root={root}
            onChange={onChange}
            depth={depth + 1}
            maxDepth={maxDepth}
          />
        ) : (
          <ConditionRow
            key={i}
            condition={child}
            onChange={(c) => onChange(updateAt(root, [...path, i], () => c))}
            onRemove={() => onChange(removeAt(root, [...path, i]))}
          />
        ),
      )}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange(appendAt(root, path, newCondition()))}
        >
          <Plus /> {t("criteria.addCondition")}
        </Button>
        {depth < maxDepth ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange(appendAt(root, path, newGroup()))}
          >
            <FolderPlus /> {t("criteria.addGroup")}
          </Button>
        ) : null}
      </div>
    </div>
  );
};

/** Recursive AND/OR editor. Controlled: pass the tree in, get the new tree back. */
export const CriteriaBuilder = ({ value, onChange, maxDepth = 3 }: Props) => (
  <GroupBox
    group={value}
    path={[]}
    root={value}
    onChange={onChange}
    depth={0}
    maxDepth={maxDepth}
  />
);
