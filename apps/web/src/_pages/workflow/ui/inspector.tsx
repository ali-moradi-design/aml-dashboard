"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  conditionFields, roleKeys, workflowCategories,
  type ConditionField, type WorkflowCondition, type WorkflowGraph, type WorkflowStep, type WorkflowTransition,
} from "@aml/shared";
import { useLocale } from "@/shared/i18n/use-locale";
import { formatNumber } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Note } from "@/shared/ui/panel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

const VALUE_NAMESPACE = { riskLevel: "risk", priority: "priority", recommendation: "recommendation" } as const;

const Row = ({ label, children, htmlFor }: { label: string; children: React.ReactNode; htmlFor?: string }) => (
  <div className="flex flex-col gap-1.5">
    <Label htmlFor={htmlFor} className="text-xs text-text-secondary">{label}</Label>
    {children}
  </div>
);

const Pick = <T extends string>({ value, options, onChange, disabled, label }: { value: T; options: Array<{ value: T; label: string }>; onChange: (v: T) => void; disabled: boolean; label: string }) => (
  <Select value={value} onValueChange={(v) => onChange(v as T)} disabled={disabled}>
    <SelectTrigger aria-label={label}><SelectValue /></SelectTrigger>
    <SelectContent>{options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
  </Select>
);

const Roles = ({ value, onChange, disabled, hint }: { value: string[]; onChange: (v: Array<(typeof roleKeys)[number]>) => void; disabled: boolean; hint?: string }) => {
  const { t } = useTranslation();
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-xs text-text-secondary">{t("workflow.roles")}</legend>
      {roleKeys.map((r) => (
        <label key={r} className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={value.includes(r)}
            disabled={disabled}
            onCheckedChange={(on) => onChange((on ? [...value, r] : value.filter((x) => x !== r)) as Array<(typeof roleKeys)[number]>)}
          />
          {t(`role.${r}`)}
        </label>
      ))}
      {hint ? <p className="text-xs text-text-secondary">{hint}</p> : null}
    </fieldset>
  );
};

/** Text that commits on blur, so typing a new id does not rewire transitions on every key. */
const IdInput = ({ value, taken, disabled, onCommit, id }: { value: string; taken: Set<string>; disabled: boolean; onCommit: (v: string) => void; id: string }) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(value);
  const [shown, setShown] = useState(value);
  if (shown !== value) {
    setShown(value);
    setDraft(value);
  }
  const error = !/^[a-z][a-z0-9_]{1,30}$/.test(draft) ? t("errors.stepId") : draft !== value && taken.has(draft) ? t("workflow.idTaken") : null;
  return (
    <>
      <Input id={id} dir="ltr" className="font-mono" value={draft} disabled={disabled} aria-invalid={Boolean(error)} onChange={(e) => setDraft(e.target.value)} onBlur={() => (error ? setDraft(value) : draft !== value && onCommit(draft))} />
      {error ? <p className="text-xs text-risk-high-text">{error}</p> : null}
    </>
  );
};

export const StepInspector = ({ graph, step, readOnly, load, onChange, onRemove }: { graph: WorkflowGraph; step: WorkflowStep; readOnly: boolean; load: number; onChange: (patch: Partial<WorkflowStep>) => void; onRemove: () => void }) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const taken = new Set(graph.steps.map((s) => s.id));
  return (
    <div className="flex flex-col gap-4">
      <Row label={t("workflow.stepId")} htmlFor="step-id"><IdInput id="step-id" value={step.id} taken={taken} disabled={readOnly} onCommit={(id) => onChange({ id })} /></Row>
      <Row label={t("workflow.nameEn")} htmlFor="step-en"><Input id="step-en" dir="ltr" value={step.name.en} disabled={readOnly} onChange={(e) => onChange({ name: { ...step.name, en: e.target.value } })} /></Row>
      <Row label={t("workflow.nameFa")} htmlFor="step-fa"><Input id="step-fa" dir="rtl" value={step.name.fa ?? ""} disabled={readOnly} onChange={(e) => onChange({ name: { ...step.name, fa: e.target.value || undefined } })} /></Row>
      <div className="grid grid-cols-2 gap-3">
        <Row label={t("workflow.category")}><Pick label={t("workflow.category")} value={step.category} disabled={readOnly} onChange={(category) => onChange({ category })} options={workflowCategories.map((c) => ({ value: c, label: t(`caseStatus.${c}`) }))} /></Row>
        <Row label={t("workflow.kindLabel")}><Pick label={t("workflow.kindLabel")} value={step.kind} disabled={readOnly} onChange={(kind) => onChange({ kind, ...(kind === "end" ? { slaHours: null, roles: [] } : {}) })} options={(["start", "task", "end"] as const).map((k) => ({ value: k, label: t(`workflow.kind.${k}`) }))} /></Row>
      </div>
      {step.kind !== "end" ? (
        <>
          <Row label={t("workflow.sla")} htmlFor="step-sla">
            <Input id="step-sla" type="number" min={1} max={2160} dir="ltr" value={step.slaHours ?? ""} disabled={readOnly} onChange={(e) => onChange({ slaHours: e.target.value ? Math.max(1, Math.round(Number(e.target.value))) : null })} />
          </Row>
          <Roles value={step.roles} disabled={readOnly} onChange={(roles) => onChange({ roles })} />
          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={step.membersOnly} disabled={readOnly} onCheckedChange={(on) => onChange({ membersOnly: on === true })} className="mt-0.5" />
            <span>{t("workflow.membersOnly")}<span className="block text-xs text-text-secondary">{t("workflow.membersOnlyHint")}</span></span>
          </label>
        </>
      ) : null}
      {load ? <Note>{t("workflow.stepBusy", { count: load, n: formatNumber(load, locale) })}</Note> : null}
      {!readOnly ? <Button variant="outline" className="w-fit text-risk-high-text" onClick={onRemove}><Trash2 /> {t("workflow.removeStep")}</Button> : null}
    </div>
  );
};

export const TransitionInspector = ({ graph, transition, readOnly, onChange, onRemove }: { graph: WorkflowGraph; transition: WorkflowTransition; readOnly: boolean; onChange: (patch: Partial<WorkflowTransition>) => void; onRemove: () => void }) => {
  const { t } = useTranslation();
  const c = transition.condition;
  const def = c ? conditionFields[c.field] : null;
  const name = (id: string) => graph.steps.find((s) => s.id === id)?.name.en ?? id;
  const setCondition = (patch: Partial<WorkflowCondition> | null) => onChange({ condition: patch === null ? null : { ...(c ?? { field: "totalAmount", operator: "gt", value: 1_000_000 }), ...patch } });
  const changeField = (field: ConditionField) => {
    const d = conditionFields[field];
    setCondition({ field, operator: d.type === "number" ? "gt" : "eq", value: d.type === "number" ? 0 : d.values[0] });
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-secondary">{name(transition.from)} → {name(transition.to)}</p>
      <Row label={t("workflow.labelEn")} htmlFor="tr-en"><Input id="tr-en" dir="ltr" value={transition.label.en} disabled={readOnly} onChange={(e) => onChange({ label: { ...transition.label, en: e.target.value } })} /></Row>
      <Row label={t("workflow.labelFa")} htmlFor="tr-fa"><Input id="tr-fa" dir="rtl" value={transition.label.fa ?? ""} disabled={readOnly} onChange={(e) => onChange({ label: { ...transition.label, fa: e.target.value || undefined } })} /></Row>

      <fieldset className="flex flex-col gap-2 rounded-md border border-border p-3">
        <legend className="px-1 text-xs text-text-secondary">{t("workflow.condition")}</legend>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={Boolean(c)} disabled={readOnly} onCheckedChange={(on) => setCondition(on ? {} : null)} />
          {t("workflow.onlyWhen")}
        </label>
        {c && def ? (
          <div className="grid grid-cols-[1fr_72px] gap-2">
            <Pick label={t("workflow.conditionField")} value={c.field} disabled={readOnly} onChange={changeField} options={(Object.keys(conditionFields) as ConditionField[]).map((f) => ({ value: f, label: t(`workflow.field.${f}`) }))} />
            <Pick
              label={t("workflow.conditionOperator")}
              value={c.operator}
              disabled={readOnly}
              onChange={(operator) => setCondition({ operator })}
              options={(def.type === "number" ? (["gt", "gte", "lt", "lte"] as const) : (["eq", "neq"] as const)).map((o) => ({ value: o, label: { gt: ">", gte: "≥", lt: "<", lte: "≤", eq: "=", neq: "≠" }[o] }))}
            />
            <div className="col-span-2">
              {def.type === "number" ? (
                <Input type="number" dir="ltr" aria-label={t("workflow.conditionValue")} value={String(c.value)} disabled={readOnly} onChange={(e) => setCondition({ value: Number(e.target.value) })} />
              ) : (
                <Pick
                  label={t("workflow.conditionValue")}
                  value={String(c.value)}
                  disabled={readOnly}
                  onChange={(value) => setCondition({ value })}
                  options={(def.values as readonly string[]).map((v) => ({ value: v, label: t(`${VALUE_NAMESPACE[c.field as keyof typeof VALUE_NAMESPACE]}.${v}`) }))}
                />
              )}
            </div>
          </div>
        ) : null}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-xs text-text-secondary">{t("workflow.requirements")}</legend>
        {(["fourEyes", "requireFindings", "requireReason", "requireSar"] as const).map((flag) => (
          <label key={flag} className="flex items-start gap-2 text-sm">
            <Checkbox checked={transition[flag]} disabled={readOnly} onCheckedChange={(on) => onChange({ [flag]: on === true })} className="mt-0.5" />
            <span>{t(`workflow.flag.${flag}`)}<span className="block text-xs text-text-secondary">{t(`workflow.flagHint.${flag}`)}</span></span>
          </label>
        ))}
      </fieldset>
      <Roles value={transition.roles} disabled={readOnly} onChange={(roles) => onChange({ roles })} hint={t("workflow.transitionRolesHint")} />
      {!readOnly ? <Button variant="outline" className="w-fit text-risk-high-text" onClick={onRemove}><Trash2 /> {t("workflow.removeTransition")}</Button> : null}
    </div>
  );
};
