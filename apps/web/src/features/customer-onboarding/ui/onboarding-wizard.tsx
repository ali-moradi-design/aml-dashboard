"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { customerOnboardingSchema, onboardingSteps, type CustomerOnboarding } from "@aml/shared";
import { useCreateCustomer } from "@/entities/customer";
import { useAutosaveDraft, useDeleteDraft, useDraft } from "@/entities/draft";
import { useHref, useLocale } from "@/shared/i18n/use-locale";
import { formatRelative } from "@/shared/lib/format";
import { useUnsavedGuard } from "@/shared/lib/use-unsaved-guard";
import { stepOfPath, validateStep } from "@/shared/lib/wizard";
import { Button } from "@/shared/ui/button";
import { applyServerErrors, ErrorSummary } from "@/shared/ui/form";
import { Panel } from "@/shared/ui/panel";
import { Stepper } from "@/shared/ui/stepper";
import {
  AccountsStep,
  ContactStep,
  IdentityStep,
  ProfileStep,
  ReviewStep,
  ShareholdersStep,
} from "./steps";

const empty: CustomerOnboarding = {
  type: "PERSON",
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  nationality: "",
  occupation: "",
  employer: "",
  companyName: "",
  registrationNumber: "",
  incorporationDate: "",
  industry: "",
  email: "",
  phone: "",
  country: "" as never,
  city: "",
  branchCode: "",
  addressLine: "",
  sourceOfFunds: "" as never,
  expectedMonthlyVolume: 0,
  minTransaction: 0,
  maxTransaction: 0,
  pep: false,
  shareholders: [],
  accounts: [{ iban: "", currency: "EUR" }],
};

const STEP_UI = [
  IdentityStep,
  ContactStep,
  ProfileStep,
  ShareholdersStep,
  AccountsStep,
  ReviewStep,
];

/** Customer onboarding: multi-step form with per-step validation, autosaved draft and unsaved-changes guard. */
export const OnboardingWizard = () => {
  const { t } = useTranslation();
  const locale = useLocale();
  const href = useHref();
  const router = useRouter();
  const draft = useDraft("customer");
  const deleteDraft = useDeleteDraft("customer");
  const create = useCreateCustomer();
  const [resumeAnswered, setResumeAnswered] = useState(false);
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [attempts, setAttempts] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<CustomerOnboarding>({
    resolver: zodResolver(customerOnboardingSchema) as never,
    defaultValues: empty,
    mode: "onTouched",
  });
  const type = useWatch({ control: form.control, name: "type" });
  const values = useWatch({ control: form.control });

  // Companies get a shareholders step; persons skip it.
  const visible = useMemo(
    () =>
      onboardingSteps
        .map((s, i) => ({ ...s, i }))
        .filter((s) => type === "COMPANY" || s.key !== "shareholders"),
    [type],
  );
  const pos = visible.findIndex((s) => s.i === step);
  const current = visible[pos] ?? visible[0]!;
  const StepUi = STEP_UI[current.i]!;

  const dirty = form.formState.isDirty && !submitted;
  const { savedAt, saving } = useAutosaveDraft("customer", values, step, dirty);
  useUnsavedGuard(dirty, t("forms.unsavedConfirm"));

  const goTo = (target: number) => {
    // Moving forward validates the current step; moving back never blocks.
    if (target > step && !validateStep(form, current.schema)) {
      setAttempts((a) => a + 1);
      return;
    }
    if (target > step) setCompleted((c) => new Set(c).add(step));
    setStep(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = form.handleSubmit(
    (data) =>
      create.mutate(data, {
        onSuccess: ({ code }) => {
          setSubmitted(true);
          deleteDraft.mutate();
          router.push(href(`/customers/${code}`));
        },
        onError: (error) => {
          // Server errors are mapped to their fields; jump to the step that owns the first one.
          if (applyServerErrors(form, error)) {
            const first = Object.keys(form.formState.errors)[0];
            const target = first ? stepOfPath(onboardingSteps, first) : -1;
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
        <p className="text-base text-text">
          {t("forms.draftFound", { when: formatRelative(draft.data.updatedAt, locale) })}
        </p>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              form.reset(
                { ...empty, ...(draft.data!.data as Partial<CustomerOnboarding>) },
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
            steps={visible.map((s) => ({ key: s.key, label: t(`onboarding.step.${s.key}`) }))}
            current={pos}
            completed={new Set([...completed].map((c) => visible.findIndex((s) => s.i === c)))}
            onSelect={(i) => goTo(visible[i]!.i)}
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
          <h2 className="text-xl text-heading">{t(`onboarding.step.${current.key}`)}</h2>
          <p className="-mt-3 text-text-secondary">{t(`onboarding.stepHint.${current.key}`)}</p>
          <StepUi />
        </Panel>
        <div className="flex justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={pos === 0}
            onClick={() => goTo(visible[pos - 1]!.i)}
          >
            {t("forms.back")}
          </Button>
          {current.key === "review" ? (
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? t("forms.saving") : t("onboarding.submit")}
            </Button>
          ) : (
            <Button type="button" onClick={() => goTo(visible[pos + 1]!.i)}>
              {t("forms.next")}
            </Button>
          )}
        </div>
      </form>
    </FormProvider>
  );
};
