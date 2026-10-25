"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { caseTransitionSchema, localized, type CaseDetail, type CaseTransition } from "@aml/shared";
import { useTransitionCase } from "@/entities/case";
import { useLocale } from "@/shared/i18n/use-locale";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { a11y, applyServerErrors, Field } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Note } from "@/shared/ui/panel";
import { Textarea } from "@/shared/ui/textarea";

type Action = CaseDetail["allowed"]["transitions"][number];

const TransitionDialog = ({
  code,
  action,
  onClose,
}: {
  code: string;
  action: Action;
  onClose: () => void;
}) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const transition = useTransitionCase();
  // The workflow decides what this step needs (a reason, a SAR reference); the server checks again.
  const schema = caseTransitionSchema.superRefine((v, ctx) => {
    if (action.requireReason && !v.note)
      ctx.addIssue({ code: "custom", path: ["note"], message: "errors.required" });
    if (action.requireSar && !v.sarReference)
      ctx.addIssue({ code: "custom", path: ["sarReference"], message: "errors.required" });
  });
  const form = useForm<CaseTransition>({
    resolver: zodResolver(schema),
    defaultValues: { transitionId: action.id, note: "", sarReference: "" },
  });
  const {
    register,
    formState: { errors },
  } = form;
  const label = localized(action.label, locale);
  const Arrow = locale === "fa" || locale === "ar" ? ArrowLeft : ArrowRight;

  const submit = form.handleSubmit((v) =>
    transition.mutate(
      {
        code,
        transitionId: action.id,
        note: v.note || undefined,
        sarReference: v.sarReference || undefined,
      },
      { onSuccess: onClose, onError: (e) => applyServerErrors(form, e) },
    ),
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
            <DialogDescription className="flex items-center gap-1.5">
              {t("caseFlow.movesTo")} <Arrow className="size-3.5" />{" "}
              <span className="text-text">{localized(action.toName, locale)}</span>
            </DialogDescription>
          </DialogHeader>
          {action.requireSar ? (
            <Field
              name="sarReference"
              label={t("fields.sarReference")}
              errors={errors}
              required
              hint={t("caseFlow.sarHint")}
            >
              <Input
                dir="ltr"
                className="font-mono"
                placeholder="SAR-2026-00000"
                {...a11y("sarReference", errors)}
                {...register("sarReference")}
              />
            </Field>
          ) : null}
          <Field
            name="note"
            label={action.requireReason ? t("fields.reason") : t("caseFlow.noteOptional")}
            errors={errors}
            required={action.requireReason}
          >
            <Textarea rows={4} {...a11y("note", errors)} {...register("note")} />
          </Field>
          {errors.root ? (
            <Note tone="danger">
              {t(errors.root.message ?? "errors.generic", { defaultValue: errors.root.message })}
            </Note>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("forms.cancel")}
            </Button>
            <Button type="submit" disabled={transition.isPending}>
              {transition.isPending ? t("forms.saving") : label}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

/**
 * The buttons come from the workflow engine on the server (`allowed.transitions`): step roles,
 * conditions and the four-eyes rule are already applied. Blocked actions stay visible with the reason.
 */
export const CaseTransitionActions = ({ detail }: { detail: CaseDetail }) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const [action, setAction] = useState<Action | null>(null);
  const { case: c, allowed } = detail;
  const blocked = [...new Set(allowed.transitions.map((a) => a.blocked).filter(Boolean))] as Array<
    NonNullable<Action["blocked"]>
  >;

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {allowed.transitions.map((a) => {
          const backwards = a.toCategory === "OPEN";
          const primary = !backwards && a.toCategory !== "CLOSED";
          return (
            <Button
              key={a.id}
              variant={primary ? "default" : "outline"}
              disabled={Boolean(a.blocked)}
              onClick={() => setAction(a)}
            >
              {localized(a.label, locale)}
            </Button>
          );
        })}
      </div>
      {blocked.map((reason) => (
        <p key={reason} className="max-w-xs text-end text-xs text-text-secondary">
          {t(reason === "fourEyes" ? "caseFlow.fourEyes" : "caseFlow.notReady")}
        </p>
      ))}
      {action ? (
        <TransitionDialog code={c.code} action={action} onClose={() => setAction(null)} />
      ) : null}
    </div>
  );
};
