"use client";

import { Plus, Trash2 } from "lucide-react";
import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { citiesOf, countries, currencies, formatIban, type CustomerOnboarding } from "@aml/shared";
import { checkEmail, checkIban } from "@/entities/customer";
import { useReference } from "@/entities/reference";
import { useLocale } from "@/shared/i18n/use-locale";
import { formatNumber, formatPercent } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { a11y, Field } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

type F = CustomerOnboarding;

const SelectField = ({
  name,
  options,
  placeholder,
  onChange,
}: {
  name: keyof F & string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  onChange?: (v: string) => void;
}) => {
  const { control, formState } = useFormContext<F>();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Select
          value={(field.value as string) || ""}
          onValueChange={(v) => {
            field.onChange(v);
            onChange?.(v);
          }}
        >
          <SelectTrigger {...a11y(name, formState.errors)} onBlur={field.onBlur}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  );
};

export const useCountryOptions = () => {
  const { t } = useTranslation();
  return countries.map((c) => ({
    value: c.code,
    label: t(`country.${c.code}`, { defaultValue: c.code }),
  }));
};

export const IdentityStep = () => {
  const { t } = useTranslation();
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<F>();
  const type = useWatch({ control, name: "type" });
  const countryOptions = useCountryOptions();

  return (
    <div className="flex flex-col gap-5">
      <fieldset className="grid grid-cols-2 gap-3">
        <legend className="mb-2 text-sm">{t("onboarding.typeQuestion")}</legend>
        {(["PERSON", "COMPANY"] as const).map((v) => (
          <label
            key={v}
            className={cn(
              "cursor-pointer rounded-md border p-4 transition-colors",
              type === v ? "border-brand bg-brand-soft" : "border-border hover:bg-muted",
            )}
          >
            <input type="radio" value={v} className="sr-only" {...register("type")} />
            <span className="block text-text">{t(`customerType.${v}`)}</span>
            <span className="text-xs text-text-secondary">{t(`onboarding.typeHint.${v}`)}</span>
          </label>
        ))}
      </fieldset>
      {/* Conditional fields: different data for a person and a company. */}
      {type === "PERSON" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="firstName" label={t("fields.firstName")} errors={errors} required>
            <Input
              {...a11y("firstName", errors)}
              {...register("firstName")}
              autoComplete="given-name"
            />
          </Field>
          <Field name="lastName" label={t("fields.lastName")} errors={errors} required>
            <Input
              {...a11y("lastName", errors)}
              {...register("lastName")}
              autoComplete="family-name"
            />
          </Field>
          <Field name="dateOfBirth" label={t("fields.dateOfBirth")} errors={errors} required>
            <Input
              type="date"
              dir="ltr"
              {...a11y("dateOfBirth", errors)}
              {...register("dateOfBirth")}
            />
          </Field>
          <Field name="nationality" label={t("fields.nationality")} errors={errors} required>
            <SelectField
              name="nationality"
              options={countryOptions}
              placeholder={t("forms.choose")}
            />
          </Field>
          <Field name="occupation" label={t("fields.occupation")} errors={errors} required>
            <Input {...a11y("occupation", errors)} {...register("occupation")} />
          </Field>
          <Field name="employer" label={t("fields.employer")} errors={errors}>
            <Input {...a11y("employer", errors)} {...register("employer")} />
          </Field>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            name="companyName"
            label={t("fields.companyName")}
            errors={errors}
            required
            className="sm:col-span-2"
          >
            <Input
              {...a11y("companyName", errors)}
              {...register("companyName")}
              autoComplete="organization"
            />
          </Field>
          <Field
            name="registrationNumber"
            label={t("fields.registrationNumber")}
            errors={errors}
            required
          >
            <Input
              dir="ltr"
              {...a11y("registrationNumber", errors)}
              {...register("registrationNumber")}
            />
          </Field>
          <Field
            name="incorporationDate"
            label={t("fields.incorporationDate")}
            errors={errors}
            required
          >
            <Input
              type="date"
              dir="ltr"
              {...a11y("incorporationDate", errors)}
              {...register("incorporationDate")}
            />
          </Field>
          <Field
            name="industry"
            label={t("fields.industry")}
            errors={errors}
            required
            className="sm:col-span-2"
          >
            <Input {...a11y("industry", errors)} {...register("industry")} />
          </Field>
        </div>
      )}
    </div>
  );
};

export const ContactStep = () => {
  const { t } = useTranslation();
  const {
    register,
    control,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useFormContext<F>();
  const { data: ref } = useReference();
  const country = useWatch({ control, name: "country" });
  const city = useWatch({ control, name: "city" });
  const countryOptions = useCountryOptions();
  // Dependent selects: country → city → branch. Changing a parent clears its children.
  const cityOptions = citiesOf(country ?? "").map((c) => ({
    value: c,
    label: t(`city.${c}`, { defaultValue: c }),
  }));
  const branches = (ref?.branches ?? [])
    .filter((b) => b.country === country)
    .sort((a, b) => Number(b.city === city) - Number(a.city === city));

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field
        name="email"
        label={t("fields.email")}
        errors={errors}
        required
        hint={t("onboarding.emailHint")}
      >
        <Input
          type="email"
          dir="ltr"
          autoComplete="email"
          {...a11y("email", errors)}
          {...register("email", {
            // Async validation: the address must not belong to another customer.
            onBlur: async (e: React.FocusEvent<HTMLInputElement>) => {
              const value = e.target.value.trim();
              if (!value.includes("@")) return;
              const r = await checkEmail(value).catch(() => null);
              if (r && !r.available)
                setError("email", { type: "async", message: "errors.emailTaken" });
            },
          })}
        />
      </Field>
      <Field name="phone" label={t("fields.phone")} errors={errors} required>
        <Input
          type="tel"
          dir="ltr"
          autoComplete="tel"
          placeholder="+49 30 1234567"
          {...a11y("phone", errors)}
          {...register("phone")}
        />
      </Field>
      <Field name="country" label={t("fields.country")} errors={errors} required>
        <SelectField
          name="country"
          options={countryOptions}
          placeholder={t("forms.choose")}
          onChange={() => {
            setValue("city", "");
            setValue("branchCode", "");
            clearErrors(["city", "branchCode"]);
          }}
        />
      </Field>
      <Field name="city" label={t("fields.city")} errors={errors} required>
        <SelectField
          name="city"
          options={cityOptions}
          placeholder={country ? t("forms.choose") : t("onboarding.countryFirst")}
        />
      </Field>
      <Field
        name="branchCode"
        label={t("fields.branchCode")}
        errors={errors}
        required
        className="sm:col-span-2"
        hint={country && !branches.length ? t("onboarding.noBranch") : undefined}
      >
        <SelectField
          name="branchCode"
          options={branches.map((b) => ({
            value: b.code,
            label: `${t(`city.${b.city}`, { defaultValue: b.city })} (${b.code})`,
          }))}
          placeholder={country ? t("forms.choose") : t("onboarding.countryFirst")}
        />
      </Field>
      <Field
        name="addressLine"
        label={t("fields.addressLine")}
        errors={errors}
        required
        className="sm:col-span-2"
      >
        <Input
          autoComplete="street-address"
          {...a11y("addressLine", errors)}
          {...register("addressLine")}
        />
      </Field>
    </div>
  );
};

export const ProfileStep = () => {
  const { t } = useTranslation();
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<F>();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field name="sourceOfFunds" label={t("fields.sourceOfFunds")} errors={errors} required>
        <SelectField
          name="sourceOfFunds"
          options={["salary", "business", "investments", "inheritance", "other"].map((v) => ({
            value: v,
            label: t(`sourceOfFunds.${v}`),
          }))}
          placeholder={t("forms.choose")}
        />
      </Field>
      <Field
        name="expectedMonthlyVolume"
        label={t("fields.expectedMonthlyVolume")}
        errors={errors}
        required
      >
        <Input
          type="number"
          min={0}
          dir="ltr"
          {...a11y("expectedMonthlyVolume", errors)}
          {...register("expectedMonthlyVolume")}
        />
      </Field>
      <Field name="minTransaction" label={t("fields.minTransaction")} errors={errors} required>
        <Input
          type="number"
          min={0}
          dir="ltr"
          {...a11y("minTransaction", errors)}
          {...register("minTransaction")}
        />
      </Field>
      <Field
        name="maxTransaction"
        label={t("fields.maxTransaction")}
        errors={errors}
        required
        hint={t("onboarding.minMaxHint")}
      >
        <Input
          type="number"
          min={0}
          dir="ltr"
          {...a11y("maxTransaction", errors)}
          {...register("maxTransaction")}
        />
      </Field>
      <Controller
        control={control}
        name="pep"
        render={({ field }) => (
          <label className="flex items-start gap-3 rounded-md border border-border p-4 sm:col-span-2">
            <Checkbox
              checked={field.value}
              onCheckedChange={(v) => field.onChange(v === true)}
              id="field-pep"
            />
            <span>
              <span className="block text-text">{t("fields.pep")}</span>
              <span className="text-xs text-text-secondary">{t("onboarding.pepHint")}</span>
            </span>
          </label>
        )}
      />
    </div>
  );
};

/** Nested field array: each shareholder has its own list of documents. */
const ShareholderDocuments = ({ index }: { index: number }) => {
  const { t } = useTranslation();
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<F>();
  const docs = useFieldArray({ control, name: `shareholders.${index}.documents` });
  return (
    <div className="flex flex-col gap-3 rounded-md bg-muted p-3">
      <p className="text-xs text-text-secondary">{t("onboarding.documents")}</p>
      {docs.fields.map((d, j) => {
        const base = `shareholders.${index}.documents.${j}` as const;
        return (
          <div key={d.id} className="grid items-end gap-3 sm:grid-cols-[160px_1fr_160px_auto]">
            <Field name={`${base}.kind`} label={t("fields.documentKind")} errors={errors}>
              <Controller
                control={control}
                name={`${base}.kind`}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger {...a11y(`${base}.kind`, errors)}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["passport", "id-card", "register-extract"].map((k) => (
                        <SelectItem key={k} value={k}>
                          {t(`documentKind.${k}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field name={`${base}.number`} label={t("fields.documentNumber")} errors={errors}>
              <Input
                dir="ltr"
                {...a11y(`${base}.number`, errors)}
                {...register(`${base}.number`)}
              />
            </Field>
            <Field name={`${base}.expiresAt`} label={t("fields.expiresAt")} errors={errors}>
              <Input
                type="date"
                dir="ltr"
                {...a11y(`${base}.expiresAt`, errors)}
                {...register(`${base}.expiresAt`)}
              />
            </Field>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={docs.fields.length === 1}
              onClick={() => docs.remove(j)}
              aria-label={t("onboarding.removeDocument")}
            >
              <Trash2 />
            </Button>
          </div>
        );
      })}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        onClick={() => docs.append({ kind: "passport", number: "", expiresAt: "" })}
      >
        <Plus /> {t("onboarding.addDocument")}
      </Button>
    </div>
  );
};

export const ShareholdersStep = () => {
  const { t } = useTranslation();
  const locale = useLocale();
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<F>();
  const list = useFieldArray({ control, name: "shareholders" });
  const values = useWatch({ control, name: "shareholders" }) ?? [];
  const total = values.reduce((s, h) => s + (Number(h?.sharePercent) || 0), 0);
  const countryOptions = useCountryOptions();
  const ok = Math.abs(total - 100) < 0.001;

  return (
    <div className="flex flex-col gap-4">
      <div
        className={cn(
          "flex items-center justify-between rounded-md px-3 py-2 text-sm",
          ok ? "bg-risk-low-bg text-risk-low-text" : "bg-risk-medium-bg text-risk-medium-text",
        )}
        aria-live="polite"
      >
        <span>{t("onboarding.sharesTotal")}</span>
        <span>
          {formatPercent(total, locale)} / {formatPercent(100, locale)}
        </span>
      </div>
      {list.fields.map((f, i) => (
        <section key={f.id} className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-text">
              {t("onboarding.shareholder", { n: formatNumber(i + 1, locale) })}
            </h3>
            <Button type="button" variant="ghost" size="sm" onClick={() => list.remove(i)}>
              <Trash2 /> {t("forms.remove")}
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_140px_160px_120px]">
            <Field name={`shareholders.${i}.name`} label={t("fields.name")} errors={errors}>
              <Input
                {...a11y(`shareholders.${i}.name`, errors)}
                {...register(`shareholders.${i}.name`)}
              />
            </Field>
            <Field name={`shareholders.${i}.type`} label={t("fields.type")} errors={errors}>
              <Controller
                control={control}
                name={`shareholders.${i}.type`}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger {...a11y(`shareholders.${i}.type`, errors)}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["PERSON", "COMPANY"] as const).map((k) => (
                        <SelectItem key={k} value={k}>
                          {t(`customerType.${k}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field name={`shareholders.${i}.country`} label={t("fields.country")} errors={errors}>
              <Controller
                control={control}
                name={`shareholders.${i}.country`}
                render={({ field }) => (
                  <Select value={field.value || ""} onValueChange={field.onChange}>
                    <SelectTrigger {...a11y(`shareholders.${i}.country`, errors)}>
                      <SelectValue placeholder={t("forms.choose")} />
                    </SelectTrigger>
                    <SelectContent>
                      {countryOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field
              name={`shareholders.${i}.sharePercent`}
              label={t("fields.sharePercent")}
              errors={errors}
            >
              <Input
                type="number"
                step="0.01"
                dir="ltr"
                {...a11y(`shareholders.${i}.sharePercent`, errors)}
                {...register(`shareholders.${i}.sharePercent`)}
              />
            </Field>
          </div>
          <ShareholderDocuments index={i} />
        </section>
      ))}
      <Button
        type="button"
        variant="outline"
        className="w-fit"
        onClick={() =>
          list.append({
            name: "",
            type: "PERSON",
            country: "" as never,
            sharePercent: Math.max(0, 100 - total),
            documents: [{ kind: "passport", number: "", expiresAt: "" }],
          })
        }
      >
        <Plus /> {t("onboarding.addShareholder")}
      </Button>
    </div>
  );
};

export const AccountsStep = () => {
  const { t } = useTranslation();
  const {
    register,
    control,
    setError,
    formState: { errors },
  } = useFormContext<F>();
  const list = useFieldArray({ control, name: "accounts" });
  return (
    <div className="flex flex-col gap-4">
      {list.fields.map((f, i) => (
        <div
          key={f.id}
          className="grid items-end gap-3 rounded-lg border border-border p-4 sm:grid-cols-[1fr_140px_auto]"
        >
          <Field
            name={`accounts.${i}.iban`}
            label={t("fields.iban")}
            errors={errors}
            hint={t("onboarding.ibanHint")}
          >
            <Input
              dir="ltr"
              className="font-mono"
              placeholder="DE89 3704 0044 0532 0130 00"
              {...a11y(`accounts.${i}.iban`, errors)}
              {...register(`accounts.${i}.iban`, {
                // Async validation: checksum and "already used" are checked by the API.
                onBlur: async (e: React.FocusEvent<HTMLInputElement>) => {
                  const value = e.target.value;
                  if (value.replace(/\s/g, "").length < 15) return;
                  e.target.value = formatIban(value);
                  const r = await checkIban(value).catch(() => null);
                  if (r && !r.valid)
                    setError(`accounts.${i}.iban`, { type: "async", message: "errors.iban" });
                  else if (r && !r.available)
                    setError(`accounts.${i}.iban`, { type: "async", message: "errors.ibanTaken" });
                },
              })}
            />
          </Field>
          <Field name={`accounts.${i}.currency`} label={t("fields.currency")} errors={errors}>
            <Controller
              control={control}
              name={`accounts.${i}.currency`}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={list.fields.length === 1}
            onClick={() => list.remove(i)}
            aria-label={t("forms.remove")}
          >
            <Trash2 />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        className="w-fit"
        onClick={() => list.append({ iban: "", currency: "EUR" })}
      >
        <Plus /> {t("onboarding.addAccount")}
      </Button>
    </div>
  );
};

export const ReviewStep = () => {
  const { t } = useTranslation();
  const v = useWatch<F>() as F;
  const rows: Array<[string, string | undefined]> = [
    [t("fields.type"), t(`customerType.${v.type}`)],
    [
      t("fields.name"),
      v.type === "PERSON" ? `${v.firstName ?? ""} ${v.lastName ?? ""}` : v.companyName,
    ],
    [t("fields.email"), v.email],
    [t("fields.phone"), v.phone],
    [t("fields.address"), [v.addressLine, v.city, v.country].filter(Boolean).join(", ")],
    [t("fields.branchCode"), v.branchCode],
    [t("fields.sourceOfFunds"), v.sourceOfFunds ? t(`sourceOfFunds.${v.sourceOfFunds}`) : ""],
    [t("fields.expectedMonthlyVolume"), String(v.expectedMonthlyVolume ?? "")],
    [t("fields.pep"), v.pep ? t("common.yes") : t("common.no")],
    [t("onboarding.shareholdersCount"), String(v.shareholders?.length ?? 0)],
    [
      t("onboarding.accountsCount"),
      (v.accounts ?? []).map((a) => formatIban(a.iban || "")).join(" · "),
    ],
  ];
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {rows.map(([k, val]) => (
        <div key={k} className="border-b border-border pb-2">
          <dt className="text-xs text-text-secondary">{k}</dt>
          <dd className="mt-0.5 text-text">{val || "—"}</dd>
        </div>
      ))}
    </dl>
  );
};
