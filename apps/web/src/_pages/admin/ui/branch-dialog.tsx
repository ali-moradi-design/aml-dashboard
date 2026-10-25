"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, type ReactNode } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { branchInputSchema, countryCodes, type AdminReference, type BranchInput } from "@aml/shared";
import { useSaveBranch } from "@/entities/admin";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/ui/dialog";
import { a11y, applyServerErrors, Field } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

const TIMEZONES = ["Europe/Berlin", "Europe/London", "Europe/Amsterdam", "Europe/Paris", "Europe/Zurich", "Europe/Istanbul", "Asia/Dubai", "UTC"];

type Branch = AdminReference["regions"][number]["branches"][number];

export const BranchDialog = ({ branch, regionId, reference, trigger }: { branch?: Branch; regionId: string; reference: AdminReference; trigger: ReactNode }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const save = useSaveBranch();
  const initial: BranchInput = branch
    ? { code: branch.code, city: branch.city, country: branch.country as BranchInput["country"], timezone: branch.timezone, regionId }
    : { code: "", city: "", country: "DE", timezone: "Europe/Berlin", regionId };
  const form = useForm<BranchInput>({ resolver: zodResolver(branchInputSchema) as Resolver<BranchInput>, defaultValues: initial });
  const { register, control, formState: { errors } } = form;
  const submit = form.handleSubmit((v) => save.mutate({ ...v, id: branch?.id }, { onSuccess: () => setOpen(false), onError: (e) => applyServerErrors(form, e) }));

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) form.reset(initial); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{branch ? t("admin.branches.editTitle", { code: branch.code }) : t("admin.branches.newTitle")}</DialogTitle>
            <DialogDescription>{t("admin.branches.formHint")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="code" label={t("admin.branches.code")} errors={errors} hint={t("admin.branches.codeHint")} required>
              <Input dir="ltr" className="font-mono uppercase" maxLength={3} {...a11y("code", errors)} {...register("code")} />
            </Field>
            <Field name="city" label={t("admin.branches.city")} errors={errors} required><Input {...a11y("city", errors)} {...register("city")} /></Field>
            <Field name="country" label={t("admin.branches.country")} errors={errors}>
              <Controller control={control} name="country" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="field-country"><SelectValue /></SelectTrigger>
                  <SelectContent>{countryCodes.filter((c) => !c.startsWith("X")).map((c) => <SelectItem key={c} value={c}>{t(`country.${c}`, { defaultValue: c })}</SelectItem>)}</SelectContent>
                </Select>
              )} />
            </Field>
            <Field name="timezone" label={t("admin.branches.timezone")} errors={errors}>
              <Controller control={control} name="timezone" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="field-timezone"><SelectValue /></SelectTrigger>
                  <SelectContent>{[...new Set([...TIMEZONES, field.value])].map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}</SelectContent>
                </Select>
              )} />
            </Field>
            <Field name="regionId" label={t("admin.branches.region")} errors={errors} className="sm:col-span-2">
              <Controller control={control} name="regionId" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="field-regionId"><SelectValue /></SelectTrigger>
                  <SelectContent>{reference.regions.map((r) => <SelectItem key={r.id} value={r.id}>{t(`region.${r.code}`, { defaultValue: r.name })}</SelectItem>)}</SelectContent>
                </Select>
              )} />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("forms.cancel")}</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending ? t("forms.saving") : t("forms.save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
