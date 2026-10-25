"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, type ReactNode } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { roleKeys, userInputSchema, type AdminReference, type AdminUser, type UserInput } from "@aml/shared";
import { useSaveUser } from "@/entities/admin";
import { isHttpError } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/ui/dialog";
import { a11y, applyServerErrors, Field } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Note } from "@/shared/ui/panel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

const blank: UserInput = { name: "", email: "", role: "ANALYST", regionIds: [], clearanceRank: 1, active: true, password: "" };

/** Create a user, or edit one (role, regions, clearance, active, password reset). */
export const UserDialog = ({ user, reference, trigger }: { user?: AdminUser; reference: AdminReference; trigger: ReactNode }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const save = useSaveUser();
  const initial: UserInput = user ? { name: user.name, email: user.email, role: user.role, regionIds: user.regionIds, clearanceRank: user.clearanceRank, active: user.active, password: "" } : blank;
  const form = useForm<UserInput>({ resolver: zodResolver(userInputSchema) as Resolver<UserInput>, defaultValues: initial });
  const { register, control, formState: { errors } } = form;

  const submit = form.handleSubmit((v) => save.mutate({ ...v, id: user?.id }, { onSuccess: () => setOpen(false), onError: (e) => applyServerErrors(form, e) }));
  const forbidden = isHttpError(save.error) && save.error.status === 403;

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) { form.reset(initial); save.reset(); } }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{user ? t("admin.users.editTitle", { name: user.name }) : t("admin.users.newTitle")}</DialogTitle>
            <DialogDescription>{t("admin.users.formHint")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="name" label={t("admin.users.name")} errors={errors} required><Input {...a11y("name", errors)} {...register("name")} /></Field>
            <Field name="email" label={t("admin.users.email")} errors={errors} required><Input type="email" dir="ltr" {...a11y("email", errors)} {...register("email")} /></Field>
            <Field name="role" label={t("admin.users.role")} errors={errors}>
              <Controller control={control} name="role" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="field-role"><SelectValue /></SelectTrigger>
                  <SelectContent>{roleKeys.map((r) => <SelectItem key={r} value={r}>{t(`role.${r}`)}</SelectItem>)}</SelectContent>
                </Select>
              )} />
            </Field>
            <Field name="clearanceRank" label={t("admin.users.clearance")} errors={errors}>
              <Controller control={control} name="clearanceRank" render={({ field }) => (
                <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                  <SelectTrigger id="field-clearanceRank"><SelectValue /></SelectTrigger>
                  <SelectContent>{reference.clearanceLevels.map((l) => <SelectItem key={l.rank} value={String(l.rank)}>{l.rank} · {l.name}</SelectItem>)}</SelectContent>
                </Select>
              )} />
            </Field>
          </div>
          <fieldset>
            <legend className="mb-1.5 text-sm">{t("admin.users.regions")} <span className="text-risk-high-text" aria-hidden>*</span></legend>
            <Controller control={control} name="regionIds" render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                {reference.regions.map((r) => (
                  <label key={r.id} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                    <Checkbox checked={field.value.includes(r.id)} onCheckedChange={(v) => field.onChange(v === true ? [...field.value, r.id] : field.value.filter((x) => x !== r.id))} />
                    {t(`region.${r.code}`, { defaultValue: r.name })}
                  </label>
                ))}
              </div>
            )} />
            {errors.regionIds ? <p className="mt-1 text-xs text-risk-high-text">{t(errors.regionIds.message ?? "errors.invalid")}</p> : null}
          </fieldset>
          <Field name="password" label={user ? t("admin.users.resetPassword") : t("admin.users.password")} errors={errors} hint={user ? t("admin.users.resetHint") : t("admin.users.passwordHint")} required={!user}>
            <Input type="password" autoComplete="new-password" {...a11y("password", errors)} {...register("password")} />
          </Field>
          <Controller control={control} name="active" render={({ field }) => (
            <label className="flex items-start gap-3 text-sm">
              <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} className="mt-0.5" />
              <span>{t("admin.users.active")}<span className="block text-xs text-text-secondary">{t("admin.users.activeHint")}</span></span>
            </label>
          )} />
          {forbidden ? <Note tone="danger">{t("admin.users.selfLock")}</Note> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("forms.cancel")}</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending ? t("forms.saving") : t("forms.save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
