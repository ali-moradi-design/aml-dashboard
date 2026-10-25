"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { emptyCriteria, riskLevels, ruleFormSchema, type RuleDetail, type RuleForm as RuleFormValues } from "@aml/shared";
import { CriteriaBuilder, countConditions } from "@/features/criteria-builder";
import { CriteriaView, useSaveRule } from "@/entities/rule";
import { useHref, useLocale } from "@/shared/i18n/use-locale";
import { formatNumber } from "@/shared/lib/format";
import { useUnsavedGuard } from "@/shared/lib/use-unsaved-guard";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { a11y, applyServerErrors, ErrorSummary, Field } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Panel, PanelHeader } from "@/shared/ui/panel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";

const toValues = (rule?: RuleDetail): RuleFormValues => {
  const parsed = rule ? ruleFormSchema.shape.criteria.safeParse(rule.criteria) : null;
  return {
    code: rule?.code ?? "R-",
    name: rule?.name ?? "",
    description: rule?.description ?? "",
    riskLevel: rule?.riskLevel ?? "MEDIUM",
    enabled: rule?.enabled ?? true,
    criteria: parsed?.success ? parsed.data : emptyCriteria(),
  };
};

/** Create or edit a detection rule; the AND/OR tree is the same builder the transaction search uses. */
export const RuleForm = ({ rule }: { rule?: RuleDetail }) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const href = useHref();
  const router = useRouter();
  const mode = rule ? "update" : "create";
  const save = useSaveRule(mode);
  const [attempts, setAttempts] = useState(0);
  const [saved, setSaved] = useState(false);
  const form = useForm<RuleFormValues>({
    // The criteria tree is a z.lazy schema whose input type is unknown; output and form types match.
    resolver: zodResolver(ruleFormSchema) as Resolver<RuleFormValues>,
    defaultValues: toValues(rule),
    mode: "onTouched",
  });
  const { register, control, formState: { errors, isDirty } } = form;
  const criteria = useWatch({ control, name: "criteria" });
  useUnsavedGuard(isDirty && !saved, t("forms.unsavedConfirm"));

  const submit = form.handleSubmit(
    (v) =>
      save.mutate(v, {
        onSuccess: ({ code }) => {
          setSaved(true);
          router.push(href(`/rules/${code}`));
        },
        onError: (e) => {
          applyServerErrors(form, e);
          setAttempts((a) => a + 1);
        },
      }),
    () => setAttempts((a) => a + 1),
  );

  const conditions = countConditions(criteria);

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <ErrorSummary errors={errors} submitCount={attempts} />
      <div className="flex flex-col gap-6 xl:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <Panel>
            <PanelHeader eyebrow={t("ruleForm.basics")} />
            <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
              <Field name="code" label={t("fields.ruleCode")} errors={errors} required hint={rule ? t("ruleForm.codeLocked") : t("ruleForm.codeHint")}>
                <Input dir="ltr" className="font-mono uppercase" disabled={Boolean(rule)} {...a11y("code", errors)} {...register("code", { setValueAs: (v: string) => v.toUpperCase() })} />
              </Field>
              <Field name="name" label={t("fields.name")} errors={errors} required><Input {...a11y("name", errors)} {...register("name")} /></Field>
            </div>
            <Field name="description" label={t("fields.description")} errors={errors} required hint={t("ruleForm.descriptionHint")}>
              <Textarea rows={3} {...a11y("description", errors)} {...register("description")} />
            </Field>
            <div className="flex flex-wrap items-end gap-6">
              <Field name="riskLevel" label={t("fields.riskLevel")} errors={errors} className="w-48">
                <Controller control={control} name="riskLevel" render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger {...a11y("riskLevel", errors)}><SelectValue /></SelectTrigger>
                    <SelectContent>{riskLevels.map((r) => <SelectItem key={r} value={r}>{t(`risk.${r}`)}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
              </Field>
              <Controller control={control} name="enabled" render={({ field }) => (
                <label className="flex h-9 items-center gap-2 text-sm">
                  <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />
                  {t("ruleForm.enabled")}
                </label>
              )} />
            </div>
          </Panel>

          <Panel>
            <PanelHeader eyebrow={t("ruleForm.criteria")} title={t("ruleForm.criteriaTitle", { count: conditions, n: formatNumber(conditions, locale) })} />
            <Controller control={control} name="criteria" render={({ field }) => <CriteriaBuilder value={field.value} onChange={field.onChange} />} />
            {errors.criteria ? <p className="text-xs text-risk-high-text">{t("ruleForm.criteriaInvalid")}</p> : null}
          </Panel>
        </div>

        <div className="flex w-full flex-col gap-6 xl:w-[360px] xl:shrink-0">
          <Panel className="xl:sticky xl:top-20">
            <PanelHeader eyebrow={t("ruleForm.preview")} title={t("ruleForm.previewTitle")} />
            {conditions ? <CriteriaView group={criteria} /> : <p className="text-sm text-text-secondary">{t("ruleForm.noConditions")}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>{t("forms.cancel")}</Button>
              <Button type="submit" disabled={save.isPending || (Boolean(rule) && !isDirty)}>{save.isPending ? t("forms.saving") : rule ? t("forms.save") : t("ruleForm.create")}</Button>
            </div>
          </Panel>
        </div>
      </div>
    </form>
  );
};
