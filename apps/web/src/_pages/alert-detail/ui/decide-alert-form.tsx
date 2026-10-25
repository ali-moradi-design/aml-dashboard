"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { alertDecisionSchema, type AlertDecision } from "@aml/shared";
import { useDecideAlert } from "@/entities/alert";
import { isHttpError } from "@/shared/api";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";

/** Close as false positive or escalate. Uses the same Zod schema the API validates with. */
export const DecideAlertForm = ({ alertId }: { alertId: string }) => {
  const { t } = useTranslation();
  const decide = useDecideAlert();
  const form = useForm<AlertDecision>({
    resolver: zodResolver(alertDecisionSchema),
    defaultValues: { decision: "CLOSE_FALSE_POSITIVE", note: "" },
  });
  const decision = useWatch({ control: form.control, name: "decision" });
  const noteError = form.formState.errors.note;

  const submit = (values: AlertDecision) => decide.mutate({ id: alertId, ...values });

  return (
    <form onSubmit={form.handleSubmit(submit)} className="flex flex-col gap-4" noValidate>
      <fieldset className="grid grid-cols-2 gap-2">
        <legend className="mb-2 text-sm text-text">{t("alertDetail.decision.choose")}</legend>
        {(["CLOSE_FALSE_POSITIVE", "ESCALATE"] as const).map((d) => (
          <label
            key={d}
            className={cn(
              "flex cursor-pointer flex-col gap-0.5 rounded-md border px-3 py-2.5 transition-colors",
              decision === d
                ? d === "ESCALATE"
                  ? "border-risk-high bg-risk-high-bg"
                  : "border-brand bg-brand-soft"
                : "border-border hover:bg-muted",
            )}
          >
            <input type="radio" value={d} className="sr-only" {...form.register("decision")} />
            <span className="text-text">{t(`alertDetail.decision.${d}`)}</span>
            <span className="text-xs text-text-secondary">
              {t(`alertDetail.decision.${d}_hint`)}
            </span>
          </label>
        ))}
      </fieldset>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="note">{t("alertDetail.decision.note")}</Label>
        <Textarea
          id="note"
          rows={4}
          aria-invalid={!!noteError}
          placeholder={t("alertDetail.decision.notePlaceholder")}
          {...form.register("note")}
        />
        {noteError ? (
          <p className="text-xs text-risk-high-text">{t("alertDetail.decision.noteTooShort")}</p>
        ) : null}
      </div>
      {decide.error ? (
        <p
          role="alert"
          className="rounded-md bg-risk-high-bg px-3 py-2 text-sm text-risk-high-text"
        >
          {isHttpError(decide.error) && decide.error.status === 409
            ? t("alertDetail.decision.alreadyDecided")
            : t("errors.generic")}
        </p>
      ) : null}
      <Button
        type="submit"
        variant={decision === "ESCALATE" ? "destructive" : "default"}
        disabled={decide.isPending}
      >
        {t(
          decide.isPending
            ? "alertDetail.decision.saving"
            : `alertDetail.decision.submit_${decision}`,
        )}
      </Button>
    </form>
  );
};
