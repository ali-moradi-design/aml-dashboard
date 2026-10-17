"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CronExpressionParser } from "cron-parser";
import { CalendarClock } from "lucide-react";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { jobInputSchema, type JobInput, type JobRow } from "@aml/shared";
import { useUpdateJob } from "@/entities/job";
import { useLocale } from "@/shared/i18n/use-locale";
import { toIntlLocale } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/ui/dialog";
import { a11y, applyServerErrors, Field } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

export const cronPresets = [
  { key: "every10", cron: "*/10 * * * *" },
  { key: "every15", cron: "*/15 * * * *" },
  { key: "hourly", cron: "0 * * * *" },
  { key: "nightly", cron: "0 2 * * *" },
  { key: "weekdays", cron: "0 7 * * 1-5" },
  { key: "weekly", cron: "0 6 * * 1" },
] as const;

const TIMEZONES = ["Europe/Berlin", "Europe/London", "Europe/Istanbul", "Asia/Dubai", "UTC"];

/** The next runs of a cron expression, or null when it does not parse. Computed in the browser. */
const nextRuns = (cron: string, tz: string, count = 5) => {
  try {
    return CronExpressionParser.parse(cron, { tz }).take(count).map((d) => d.toDate());
  } catch {
    return null;
  }
};

export const JobScheduleDialog = ({ job }: { job: JobRow }) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const update = useUpdateJob();
  const form = useForm<JobInput>({ resolver: zodResolver(jobInputSchema), defaultValues: { cron: job.cron, timezone: job.timezone, enabled: job.enabled } });
  const { register, control, setValue, formState: { errors } } = form;
  const [cron, timezone] = useWatch({ control, name: ["cron", "timezone"] });
  const preset = cronPresets.find((p) => p.cron === cron.trim())?.key ?? "custom";
  const runs = nextRuns(cron.trim(), timezone);
  const fmt = new Intl.DateTimeFormat(toIntlLocale(locale), { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: timezone, timeZoneName: "short" });

  const submit = form.handleSubmit((v) => {
    if (!nextRuns(v.cron, v.timezone)) return form.setError("cron", { message: "errors.cron" });
    update.mutate({ key: job.key, ...v }, { onSuccess: () => setOpen(false), onError: (e) => applyServerErrors(form, e) });
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) form.reset({ cron: job.cron, timezone: job.timezone, enabled: job.enabled });
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><CalendarClock /> {t("jobs.editSchedule")}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} noValidate className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{t("jobs.scheduleTitle", { name: t(`jobs.names.${job.key}`, { defaultValue: job.name }) })}</DialogTitle>
            <DialogDescription>{t("jobs.scheduleHint")}</DialogDescription>
          </DialogHeader>

          <Field name="preset" label={t("jobs.preset")} errors={{}}>
            <Select value={preset} onValueChange={(v) => v !== "custom" && setValue("cron", cronPresets.find((p) => p.key === v)!.cron, { shouldDirty: true, shouldValidate: true })}>
              <SelectTrigger id="field-preset"><SelectValue /></SelectTrigger>
              <SelectContent>
                {cronPresets.map((p) => <SelectItem key={p.key} value={p.key}>{t(`jobs.presets.${p.key}`)}</SelectItem>)}
                <SelectItem value="custom">{t("jobs.presets.custom")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="cron" label={t("jobs.cron")} errors={errors} hint={t("jobs.cronHint")} required>
              <Input dir="ltr" className="font-mono" {...a11y("cron", errors)} {...register("cron")} />
            </Field>
            <Field name="timezone" label={t("jobs.timezone")} errors={errors}>
              <Controller
                control={control}
                name="timezone"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="field-timezone"><SelectValue /></SelectTrigger>
                    <SelectContent>{[...new Set([...TIMEZONES, job.timezone])].map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}</SelectContent>
                  </Select>
                )}
              />
            </Field>
          </div>

          <div className="rounded-md bg-muted p-4">
            <p className="mb-2 text-xs text-text-secondary">{t("jobs.preview")}</p>
            {runs ? (
              <ol className="flex flex-col gap-1 text-sm">
                {runs.map((d) => <li key={d.toISOString()}><time dateTime={d.toISOString()}>{fmt.format(d)}</time></li>)}
              </ol>
            ) : (
              <p className="text-sm text-risk-high-text">{t("errors.cron")}</p>
            )}
          </div>

          <Controller
            control={control}
            name="enabled"
            render={({ field }) => (
              <label className="flex items-start gap-3 text-sm">
                <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} className="mt-0.5" />
                <span>{t("jobs.enabled")}<span className="block text-xs text-text-secondary">{t("jobs.enabledHint")}</span></span>
              </label>
            )}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("forms.cancel")}</Button>
            <Button type="submit" disabled={update.isPending || !runs}>{update.isPending ? t("forms.saving") : t("forms.save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
