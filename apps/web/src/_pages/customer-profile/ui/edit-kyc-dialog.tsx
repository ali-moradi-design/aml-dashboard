"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { kycUpdateSchema, type CustomerProfile, type KycUpdate } from "@aml/shared";
import { useUpdateKyc } from "@/entities/customer";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { a11y, applyServerErrors, Field } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

/** KYC review form on the customer profile. */
export const EditKycDialog = ({ customer }: { customer: CustomerProfile["customer"] }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const update = useUpdateKyc();
  const form = useForm<KycUpdate>({
    resolver: zodResolver(kycUpdateSchema) as never,
    values: {
      occupation: customer.occupation ?? "",
      employer: customer.employer ?? "",
      sourceOfFunds: (customer.sourceOfFunds as KycUpdate["sourceOfFunds"]) ?? "other",
      expectedMonthlyVolume: Number(customer.expectedMonthlyVolume ?? 0),
      pep: customer.pep,
      kycStatus: customer.kycStatus,
      riskScore: customer.riskScore,
    },
  });
  const {
    register,
    control,
    formState: { errors },
  } = form;

  const submit = form.handleSubmit((values) =>
    update.mutate(
      { code: customer.code, ...values },
      { onSuccess: () => setOpen(false), onError: (e) => applyServerErrors(form, e) },
    ),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Pencil /> {t("customer.editKyc")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{t("customer.kycTitle")}</DialogTitle>
            <DialogDescription>{t("customer.kycHint")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            {customer.type === "PERSON" ? (
              <>
                <Field name="occupation" label={t("fields.occupation")} errors={errors}>
                  <Input {...a11y("occupation", errors)} {...register("occupation")} />
                </Field>
                <Field name="employer" label={t("fields.employer")} errors={errors}>
                  <Input {...a11y("employer", errors)} {...register("employer")} />
                </Field>
              </>
            ) : null}
            <Field name="sourceOfFunds" label={t("fields.sourceOfFunds")} errors={errors}>
              <Controller
                control={control}
                name="sourceOfFunds"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger {...a11y("sourceOfFunds", errors)}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["salary", "business", "investments", "inheritance", "other"].map((v) => (
                        <SelectItem key={v} value={v}>
                          {t(`sourceOfFunds.${v}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field
              name="expectedMonthlyVolume"
              label={t("fields.expectedMonthlyVolume")}
              errors={errors}
            >
              <Input
                type="number"
                dir="ltr"
                {...a11y("expectedMonthlyVolume", errors)}
                {...register("expectedMonthlyVolume")}
              />
            </Field>
            <Field name="kycStatus" label={t("fields.kycStatus")} errors={errors}>
              <Controller
                control={control}
                name="kycStatus"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger {...a11y("kycStatus", errors)}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["PENDING", "VERIFIED", "EXPIRED", "REJECTED"] as const).map((v) => (
                        <SelectItem key={v} value={v}>
                          {t(`kycStatus.${v}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field name="riskScore" label={t("fields.riskScore")} errors={errors}>
              <Input
                type="number"
                min={0}
                max={100}
                dir="ltr"
                {...a11y("riskScore", errors)}
                {...register("riskScore")}
              />
            </Field>
            <Controller
              control={control}
              name="pep"
              render={({ field }) => (
                <label className="flex items-center gap-2 sm:col-span-2">
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(v) => field.onChange(v === true)}
                  />{" "}
                  {t("fields.pep")}
                </label>
              )}
            />
          </div>
          {update.isError && !Object.keys(errors).length ? (
            <p className="text-sm text-risk-high-text">{t("errors.generic")}</p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t("forms.cancel")}
            </Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? t("forms.saving") : t("forms.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
