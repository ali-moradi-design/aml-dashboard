"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Controller,
  FormProvider,
  useFieldArray,
  useForm,
  useFormContext,
  useWatch,
} from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  caseCreateSchema,
  caseSteps,
  countries,
  currencies,
  riskLevels,
  typologies,
  type CaseCreate,
} from "@aml/shared";
import { useCountryOptions } from "@/features/customer-onboarding";
import { getAlert } from "@/entities/alert";
import { useCreateCase } from "@/entities/case";
import { useAutosaveDraft, useDeleteDraft, useDraft } from "@/entities/draft";
import { useReference } from "@/entities/reference";
import { useHref, useLocale } from "@/shared/i18n/use-locale";
import { formatNumber, formatRelative } from "@/shared/lib/format";
import { useUnsavedGuard } from "@/shared/lib/use-unsaved-guard";
import { stepOfPath, validateStep } from "@/shared/lib/wizard";
import { Button } from "@/shared/ui/button";
import { a11y, applyServerErrors, ErrorSummary, Field } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Panel } from "@/shared/ui/panel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Stepper } from "@/shared/ui/stepper";
import { Textarea } from "@/shared/ui/textarea";

type F = CaseCreate;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const TYPOLOGY_BY_RULE: Record<string, F["typology"]> = {
  "R-STRUCT": "structuring",
  "R-RAPID": "layering",
  "R-HRC": "high_risk_jurisdiction",
  "R-DORMANT": "dormant_account",
  "R-ROUND": "trade_based",
};

const empty = (): F => ({
  title: "",
  typology: "" as never,
  priority: "MEDIUM",
  riskLevel: "MEDIUM",
  branchCode: "",
  dueAt: iso(new Date(Date.now() + 14 * 86_400_000)),
  alertCodes: [],
  periodStart: iso(new Date(Date.now() - 90 * 86_400_000)),
  periodEnd: iso(new Date()),
  totalAmount: 0,
  summary: "",
  parties: [
    {
      name: "",
      type: "PERSON",
      role: "SUBJECT",
      country: "" as never,
      customerCode: "",
      notes: "",
      accounts: [],
    },
  ],
});

const Sel = <T extends string>({
  name,
  options,
  placeholder,
}: {
  name: string;
  options: Array<{ value: T; label: string }>;
  placeholder?: string;
}) => {
  const { control, formState } = useFormContext<F>();
  return (
    <Controller
      control={control}
      name={name as never}
      render={({ field }) => (
        <Select value={(field.value as string) || ""} onValueChange={field.onChange}>
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

const BasicsStep = () => {
  const { t } = useTranslation();
  const {
    register,
    formState: { errors },
  } = useFormContext<F>();
  const { data: ref } = useReference();
  const alertCodes = useWatch<F, "alertCodes">({ name: "alertCodes" });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field
        name="title"
        label={t("fields.title")}
        errors={errors}
        required
        className="sm:col-span-2"
      >
        <Input {...a11y("title", errors)} {...register("title")} />
      </Field>
      <Field name="typology" label={t("fields.typology")} errors={errors} required>
        <Sel
          name="typology"
          options={typologies.map((v) => ({ value: v, label: t(`typology.${v}`) }))}
          placeholder={t("forms.choose")}
        />
      </Field>
      <Field name="branchCode" label={t("fields.branchCode")} errors={errors} required>
        <Sel
          name="branchCode"
          options={(ref?.branches ?? []).map((b) => ({
            value: b.code,
            label: `${b.city} (${b.code})`,
          }))}
          placeholder={t("forms.choose")}
        />
      </Field>
      <Field name="priority" label={t("fields.priority")} errors={errors}>
        <Sel
          name="priority"
          options={(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const).map((v) => ({
            value: v,
            label: t(`priority.${v}`),
          }))}
        />
      </Field>
      <Field name="riskLevel" label={t("fields.riskLevel")} errors={errors}>
        <Sel
          name="riskLevel"
          options={riskLevels.map((v) => ({ value: v, label: t(`risk.${v}`) }))}
        />
      </Field>
      <Field name="dueAt" label={t("fields.dueAt")} errors={errors} required>
        <Input type="date" dir="ltr" {...a11y("dueAt", errors)} {...register("dueAt")} />
      </Field>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm">{t("caseNew.linkedAlerts")}</span>
        <p className="font-mono text-sm text-text-secondary">
          {alertCodes?.length ? alertCodes.join(", ") : t("caseNew.noAlerts")}
        </p>
      </div>
    </div>
  );
};

const ScopeStep = () => {
  const { t } = useTranslation();
  const {
    register,
    formState: { errors },
  } = useFormContext<F>();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field name="periodStart" label={t("fields.periodStart")} errors={errors} required>
        <Input
          type="date"
          dir="ltr"
          {...a11y("periodStart", errors)}
          {...register("periodStart")}
        />
      </Field>
      <Field name="periodEnd" label={t("fields.periodEnd")} errors={errors} required>
        <Input type="date" dir="ltr" {...a11y("periodEnd", errors)} {...register("periodEnd")} />
      </Field>
      <Field name="totalAmount" label={t("fields.totalAmount")} errors={errors} required>
        <Input
          type="number"
          min={0}
          dir="ltr"
          {...a11y("totalAmount", errors)}
          {...register("totalAmount")}
        />
      </Field>
      <Field
        name="summary"
        label={t("fields.summary")}
        errors={errors}
        required
        className="sm:col-span-2"
        hint={t("caseNew.summaryHint")}
      >
        <Textarea rows={5} {...a11y("summary", errors)} {...register("summary")} />
      </Field>
    </div>
  );
};

/** Nested field array: each related party has several accounts. */
const PartyAccounts = ({ index }: { index: number }) => {
  const { t } = useTranslation();
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<F>();
  const list = useFieldArray({ control, name: `parties.${index}.accounts` });
  return (
    <div className="flex flex-col gap-3 rounded-md bg-muted p-3">
      <p className="text-xs text-text-secondary">{t("caseNew.partyAccounts")}</p>
      {list.fields.map((f, j) => {
        const base = `parties.${index}.accounts.${j}` as const;
        return (
          <div key={f.id} className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_110px_auto]">
            <Field name={`${base}.iban`} label={t("fields.iban")} errors={errors}>
              <Input
                dir="ltr"
                className="font-mono"
                {...a11y(`${base}.iban`, errors)}
                {...register(`${base}.iban`)}
              />
            </Field>
            <Field name={`${base}.bankName`} label={t("fields.bankName")} errors={errors}>
              <Input {...a11y(`${base}.bankName`, errors)} {...register(`${base}.bankName`)} />
            </Field>
            <Field name={`${base}.currency`} label={t("fields.currency")} errors={errors}>
              <Controller
                control={control}
                name={`${base}.currency`}
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
              onClick={() => list.remove(j)}
              aria-label={t("forms.remove")}
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
        onClick={() => list.append({ iban: "", bankName: "", currency: "EUR" })}
      >
        <Plus /> {t("caseNew.addAccount")}
      </Button>
    </div>
  );
};

const PartiesStep = () => {
  const { t } = useTranslation();
  const locale = useLocale();
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<F>();
  const list = useFieldArray({ control, name: "parties" });
  const countryOptions = useCountryOptions();
  return (
    <div className="flex flex-col gap-4">
      {list.fields.map((f, i) => (
        <section key={f.id} className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-text">{t("caseNew.party", { n: formatNumber(i + 1, locale) })}</h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={list.fields.length === 1}
              onClick={() => list.remove(i)}
            >
              <Trash2 /> {t("forms.remove")}
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_150px_190px_160px]">
            <Field name={`parties.${i}.name`} label={t("fields.name")} errors={errors}>
              <Input {...a11y(`parties.${i}.name`, errors)} {...register(`parties.${i}.name`)} />
            </Field>
            <Field name={`parties.${i}.type`} label={t("fields.type")} errors={errors}>
              <Sel
                name={`parties.${i}.type`}
                options={(["PERSON", "COMPANY"] as const).map((v) => ({
                  value: v,
                  label: t(`customerType.${v}`),
                }))}
              />
            </Field>
            <Field name={`parties.${i}.role`} label={t("fields.role")} errors={errors}>
              <Sel
                name={`parties.${i}.role`}
                options={(["SUBJECT", "COUNTERPARTY", "BENEFICIAL_OWNER", "OTHER"] as const).map(
                  (v) => ({ value: v, label: t(`partyRole.${v}`) }),
                )}
              />
            </Field>
            <Field name={`parties.${i}.country`} label={t("fields.country")} errors={errors}>
              <Sel
                name={`parties.${i}.country`}
                options={countryOptions}
                placeholder={t("forms.choose")}
              />
            </Field>
          </div>
          <Field name={`parties.${i}.notes`} label={t("fields.notes")} errors={errors}>
            <Input {...register(`parties.${i}.notes`)} />
          </Field>
          <PartyAccounts index={i} />
        </section>
      ))}
      <Button
        type="button"
        variant="outline"
        className="w-fit"
        onClick={() =>
          list.append({
            name: "",
            type: "COMPANY",
            role: "COUNTERPARTY",
            country: "" as never,
            customerCode: "",
            notes: "",
            accounts: [],
          })
        }
      >
        <Plus /> {t("caseNew.addParty")}
      </Button>
    </div>
  );
};

const ReviewStep = () => {
  const { t } = useTranslation();
  const v = useWatch<F>() as F;
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {(
        [
          [t("fields.title"), v.title],
          [t("fields.typology"), v.typology ? t(`typology.${v.typology}`) : ""],
          [t("fields.priority"), t(`priority.${v.priority}`)],
          [t("fields.branchCode"), v.branchCode],
          [t("fields.period"), `${v.periodStart} – ${v.periodEnd}`],
          [t("fields.totalAmount"), String(v.totalAmount)],
          [t("caseNew.linkedAlerts"), v.alertCodes?.join(", ")],
          [
            t("caseNew.parties"),
            (v.parties ?? []).map((p) => `${p.name} (${t(`partyRole.${p.role}`)})`).join(", "),
          ],
        ] as Array<[string, string]>
      ).map(([k, val]) => (
        <div key={k} className="border-b border-border pb-2">
          <dt className="text-xs text-text-secondary">{k}</dt>
          <dd className="mt-0.5">{val || "—"}</dd>
        </div>
      ))}
      <div className="sm:col-span-2">
        <dt className="text-xs text-text-secondary">{t("fields.summary")}</dt>
        <dd className="mt-0.5 whitespace-pre-wrap">{v.summary}</dd>
      </div>
    </dl>
  );
};

const STEP_UI = [BasicsStep, ScopeStep, PartiesStep, ReviewStep];

/** Case creation: multi-step, per-step validation, autosaved draft, unsaved-changes guard, prefill from an alert. */
export const CaseWizard = ({ fromAlert }: { fromAlert?: string }) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const href = useHref();
  const router = useRouter();
  const draft = useDraft("case");
  const deleteDraft = useDeleteDraft("case");
  const create = useCreateCase();
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [attempts, setAttempts] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [resumeAnswered, setResumeAnswered] = useState(Boolean(fromAlert));
  const prefilled = useRef(false);

  const form = useForm<F>({
    resolver: zodResolver(caseCreateSchema) as never,
    defaultValues: empty(),
    mode: "onTouched",
  });
  const values = useWatch({ control: form.control });
  const dirty = form.formState.isDirty && !submitted;
  const { savedAt, saving } = useAutosaveDraft("case", values, step, dirty);
  useUnsavedGuard(dirty, t("forms.unsavedConfirm"));

  // Prefill from an escalated alert: subject, accounts, counterparty, amount and linked alert.
  useEffect(() => {
    if (!fromAlert || prefilled.current) return;
    prefilled.current = true;
    void getAlert(fromAlert).then((d) => {
      const tx = d.transaction;
      const known = countries.some((c) => c.code === d.customer.country);
      form.reset(
        {
          ...empty(),
          title: `${d.rule.name}: ${d.customer.name}`,
          typology: TYPOLOGY_BY_RULE[d.rule.code] ?? "other",
          riskLevel: d.alert.riskLevel,
          priority: d.alert.riskLevel === "HIGH" ? "HIGH" : "MEDIUM",
          branchCode: d.alert.branchCode,
          alertCodes: [d.alert.code],
          totalAmount: tx ? Math.round(Number(tx.baseAmount)) : 0,
          parties: [
            {
              name: d.customer.name,
              type: d.customer.type,
              role: "SUBJECT",
              country: (known ? d.customer.country : "") as never,
              customerCode: d.customer.code,
              notes: "",
              accounts: [
                {
                  iban: d.account.iban,
                  bankName: "Northbank",
                  currency: d.account.currency as never,
                },
              ],
            },
            ...(tx &&
            tx.channel !== "CASH" &&
            countries.some((c) => c.code === tx.counterpartyCountry)
              ? [
                  {
                    name: tx.counterpartyName,
                    type: "COMPANY" as const,
                    role: "COUNTERPARTY" as const,
                    country: tx.counterpartyCountry as never,
                    customerCode: "",
                    notes: "",
                    accounts: [],
                  },
                ]
              : []),
          ],
        },
        { keepDefaultValues: true },
      );
    });
  }, [fromAlert, form]);

  const current = caseSteps[step]!;
  const StepUi = STEP_UI[step]!;

  const goTo = (target: number) => {
    if (target > step && !validateStep(form, current.schema)) {
      setAttempts((a) => a + 1);
      return;
    }
    if (target > step) setCompleted((c) => new Set(c).add(step));
    setStep(target);
  };

  const submit = form.handleSubmit(
    (data) =>
      create.mutate(data, {
        onSuccess: ({ code }) => {
          setSubmitted(true);
          deleteDraft.mutate();
          router.push(href(`/cases/${code}`));
        },
        onError: (e) => {
          if (applyServerErrors(form, e)) {
            const first = Object.keys(form.formState.errors)[0];
            const target = first ? stepOfPath(caseSteps, first) : -1;
            if (target >= 0) setStep(target);
          }
          setAttempts((a) => a + 1);
        },
      }),
    () => setAttempts((a) => a + 1),
  );

  if (draft.data && !resumeAnswered) {
    return (
      <Panel className="max-w-xl">
        <p className="text-base">
          {t("forms.draftFound", { when: formatRelative(draft.data.updatedAt, locale) })}
        </p>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              form.reset(
                { ...empty(), ...(draft.data!.data as Partial<F>) },
                { keepDefaultValues: true },
              );
              setStep(draft.data!.step);
              setResumeAnswered(true);
            }}
          >
            {t("forms.resumeDraft")}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              deleteDraft.mutate();
              setResumeAnswered(true);
            }}
          >
            {t("forms.startFresh")}
          </Button>
        </div>
      </Panel>
    );
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Stepper
            steps={caseSteps.map((s) => ({ key: s.key, label: t(`caseNew.step.${s.key}`) }))}
            current={step}
            completed={completed}
            onSelect={goTo}
          />
          <span className="text-xs text-text-secondary" aria-live="polite">
            {saving
              ? t("forms.saving")
              : savedAt
                ? t("forms.savedDraft", { when: formatRelative(savedAt, locale) })
                : null}
          </span>
        </div>
        <ErrorSummary errors={form.formState.errors} submitCount={attempts} />
        <Panel>
          <h2 className="text-xl text-heading">{t(`caseNew.step.${current.key}`)}</h2>
          <StepUi />
        </Panel>
        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            disabled={step === 0}
            onClick={() => goTo(step - 1)}
          >
            {t("forms.back")}
          </Button>
          {current.key === "review" ? (
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? t("forms.saving") : t("caseNew.submit")}
            </Button>
          ) : (
            <Button type="button" onClick={() => goTo(step + 1)}>
              {t("forms.next")}
            </Button>
          )}
        </div>
      </form>
    </FormProvider>
  );
};
