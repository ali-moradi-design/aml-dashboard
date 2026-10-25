"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { countryCodes, currencies, systemSettingsSchema, type SystemSettings } from "@aml/shared";
import { useSaveSystemSettings, useSystemSettings } from "@/entities/settings";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { a11y, applyServerErrors, ErrorSummary, Field } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Note, Panel, PanelHeader } from "@/shared/ui/panel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";

const LEVELS = ["HIGH", "MEDIUM", "LOW"] as const;

const SystemForm = ({ settings }: { settings: SystemSettings }) => {
  const { t } = useTranslation();
  const save = useSaveSystemSettings();
  const [saved, setSaved] = useState(false);
  const form = useForm<SystemSettings>({ resolver: zodResolver(systemSettingsSchema) as Resolver<SystemSettings>, defaultValues: settings });
  const { register, control, formState: { errors, isDirty, submitCount } } = form;

  const submit = form.handleSubmit((v) => {
    setSaved(false);
    save.mutate(v, { onSuccess: (s) => { form.reset(s); setSaved(true); }, onError: (e) => applyServerErrors(form, e) });
  });

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <ErrorSummary errors={errors} submitCount={submitCount} />
      <Panel>
        <PanelHeader eyebrow={t("settings.system.eyebrow")} title={t("settings.system.title")} />
        <Field name="baseCurrency" label={t("settings.system.baseCurrency")} errors={errors} hint={t("settings.system.baseCurrencyHint")} className="max-w-xs">
          <Controller control={control} name="baseCurrency" render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="field-baseCurrency"><SelectValue /></SelectTrigger>
              <SelectContent>{currencies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          )} />
        </Field>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm">{t("settings.system.highRisk")}</legend>
          <p className="text-xs text-text-secondary">{t("settings.system.highRiskHint")}</p>
          <Controller control={control} name="highRiskCountries" render={({ field }) => (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {countryCodes.map((c) => (
                <label key={c} className="flex items-center gap-2.5 rounded-md border border-border px-3 py-2 text-sm">
                  <Checkbox checked={field.value.includes(c)} onCheckedChange={(v) => field.onChange(v === true ? [...field.value, c] : field.value.filter((x) => x !== c))} />
                  {t(`country.${c}`, { defaultValue: c })}
                </label>
              ))}
            </div>
          )} />
          {errors.highRiskCountries ? <p className="text-xs text-risk-high-text">{t(errors.highRiskCountries.message ?? "errors.invalid")}</p> : null}
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm">{t("settings.system.sla")}</legend>
          <p className="text-xs text-text-secondary">{t("settings.system.slaHint")}</p>
          <div className="grid max-w-xl gap-4 sm:grid-cols-3">
            {LEVELS.map((l) => (
              <Field key={l} name={`alertSlaHours.${l}`} label={t(`risk.${l}`)} errors={errors}>
                <Input type="number" min={1} max={720} inputMode="numeric" {...a11y(`alertSlaHours.${l}`, errors)} {...register(`alertSlaHours.${l}`, { valueAsNumber: true })} />
              </Field>
            ))}
          </div>
        </fieldset>
        <Note>{t("settings.system.audit")}</Note>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={!isDirty || save.isPending}>{save.isPending ? t("forms.saving") : t("forms.save")}</Button>
          {saved && !isDirty ? <span className="text-sm text-risk-low-text" role="status">{t("settings.saved")}</span> : null}
        </div>
      </Panel>
    </form>
  );
};

export const SystemSection = () => {
  const { data } = useSystemSettings();
  if (!data) return <Skeleton className="h-96" />;
  return <SystemForm settings={data} />;
};
