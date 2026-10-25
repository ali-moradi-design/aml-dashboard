"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { casePriorities, caseUpdateSchema, type CaseDetail, type CaseUpdate } from "@aml/shared";
import { useUpdateCase } from "@/entities/case";
import { useUnsavedGuard } from "@/shared/lib/use-unsaved-guard";
import { Button } from "@/shared/ui/button";
import { a11y, applyServerErrors, Field } from "@/shared/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";

const recommendations = ["FILE_SAR", "MONITOR", "CLOSE"] as const;

/** Findings and recommendation: read-only text unless the API says this user may edit. */
export const CaseFindings = ({ detail }: { detail: CaseDetail }) => {
  const { t } = useTranslation();
  const { case: c, allowed } = detail;
  const update = useUpdateCase();
  const values = {
    findings: c.findings ?? "",
    recommendation: c.recommendation ?? undefined,
    priority: c.priority,
  };
  const form = useForm<CaseUpdate>({
    resolver: zodResolver(caseUpdateSchema),
    defaultValues: values,
  });
  const {
    register,
    control,
    formState: { errors, isDirty },
  } = form;
  useUnsavedGuard(isDirty, t("forms.unsavedConfirm"));

  // A teammate's save arrives over the socket; take it unless this user is mid-edit.
  useEffect(() => {
    if (!form.formState.isDirty)
      form.reset({
        findings: c.findings ?? "",
        recommendation: c.recommendation ?? undefined,
        priority: c.priority,
      });
  }, [c.findings, c.recommendation, c.priority, form]);

  if (!allowed.edit) {
    return (
      <dl className="flex flex-col gap-4">
        <div>
          <dt className="text-xs text-text-secondary">{t("fields.findings")}</dt>
          <dd className="mt-1 whitespace-pre-wrap">{c.findings || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-text-secondary">{t("fields.recommendation")}</dt>
          <dd className="mt-1">
            {c.recommendation ? t(`recommendation.${c.recommendation}`) : "—"}
          </dd>
        </div>
      </dl>
    );
  }

  const submit = form.handleSubmit((v) =>
    update.mutate(
      { code: c.code, ...v },
      { onSuccess: () => form.reset(v), onError: (e) => applyServerErrors(form, e) },
    ),
  );

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Field
        name="findings"
        label={t("fields.findings")}
        errors={errors}
        hint={t("caseDetail.findingsHint")}
      >
        <Textarea rows={6} {...a11y("findings", errors)} {...register("findings")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="recommendation" label={t("fields.recommendation")} errors={errors}>
          <Controller
            control={control}
            name="recommendation"
            render={({ field }) => (
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <SelectTrigger {...a11y("recommendation", errors)}>
                  <SelectValue placeholder={t("forms.choose")} />
                </SelectTrigger>
                <SelectContent>
                  {recommendations.map((r) => (
                    <SelectItem key={r} value={r}>
                      {t(`recommendation.${r}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field name="priority" label={t("fields.priority")} errors={errors}>
          <Controller
            control={control}
            name="priority"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger {...a11y("priority", errors)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {casePriorities.map((p) => (
                    <SelectItem key={p} value={p}>
                      {t(`priority.${p}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      </div>
      <div className="flex items-center justify-end gap-3">
        {isDirty ? (
          <span className="text-xs text-text-secondary">{t("caseDetail.unsaved")}</span>
        ) : null}
        <Button type="button" variant="ghost" disabled={!isDirty} onClick={() => form.reset()}>
          {t("forms.cancel")}
        </Button>
        <Button type="submit" disabled={!isDirty || update.isPending}>
          {update.isPending ? t("forms.saving") : t("forms.save")}
        </Button>
      </div>
    </form>
  );
};
