"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { caseTransitionSchema, type CaseDetail, type CaseStatus, type CaseTransition } from "@aml/shared";
import { useTransitionCase } from "@/entities/case";
import { useMe } from "@/entities/session";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { a11y, applyServerErrors, Field } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Note } from "@/shared/ui/panel";
import { Textarea } from "@/shared/ui/textarea";

type Target = Exclude<CaseStatus, "DRAFT">;

// Going back to OPEN or closing without a report needs a reason in the audit trail.
const reasonRequired: Target[] = ["OPEN", "CLOSED"];

const schema = caseTransitionSchema.superRefine((v, ctx) => {
  if (reasonRequired.includes(v.to) && !v.note) ctx.addIssue({ code: "custom", path: ["note"], message: "errors.required" });
  if (v.to === "REPORTED" && !v.sarReference) ctx.addIssue({ code: "custom", path: ["sarReference"], message: "errors.required" });
});

const TransitionDialog = ({ code, from, to, onClose }: { code: string; from: CaseStatus; to: Target; onClose: () => void }) => {
  const { t } = useTranslation();
  const transition = useTransitionCase();
  const form = useForm<CaseTransition>({ resolver: zodResolver(schema), defaultValues: { to, note: "", sarReference: "" } });
  const { register, formState: { errors } } = form;
  const action = from === "PENDING_APPROVAL" && to === "OPEN" ? "sendBack" : to;

  const submit = form.handleSubmit((v) =>
    transition.mutate(
      { code, to: v.to, note: v.note || undefined, sarReference: v.sarReference || undefined },
      { onSuccess: onClose, onError: (e) => applyServerErrors(form, e) },
    ),
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{t(`caseFlow.action.${action}`)}</DialogTitle>
            <DialogDescription>{t(`caseFlow.explain.${action}`)}</DialogDescription>
          </DialogHeader>
          {to === "REPORTED" ? (
            <Field name="sarReference" label={t("fields.sarReference")} errors={errors} required hint={t("caseFlow.sarHint")}>
              <Input dir="ltr" className="font-mono" placeholder="SAR-2026-00000" {...a11y("sarReference", errors)} {...register("sarReference")} />
            </Field>
          ) : null}
          <Field name="note" label={t("fields.reason")} errors={errors} required={reasonRequired.includes(to)}>
            <Textarea rows={4} {...a11y("note", errors)} {...register("note")} />
          </Field>
          {errors.root ? <Note tone="danger">{t(errors.root.message ?? "errors.generic", { defaultValue: errors.root.message })}</Note> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>{t("forms.cancel")}</Button>
            <Button type="submit" disabled={transition.isPending}>{transition.isPending ? t("forms.saving") : t(`caseFlow.action.${action}`)}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

/**
 * The buttons come from the API (`allowed.transitions`), which has already applied the role,
 * the fixed status chain and the four-eyes rule; the UI only explains why one is missing.
 */
export const CaseTransitionActions = ({ detail }: { detail: CaseDetail }) => {
  const { t } = useTranslation();
  const { data: me } = useMe();
  const [target, setTarget] = useState<Target | null>(null);
  const { case: c, allowed } = detail;
  const ownCaseAwaitingApproval = c.status === "PENDING_APPROVAL" && me?.id === c.createdById && me.permissions.includes("cases.approve");
  const notReadyToSubmit = c.status === "OPEN" && allowed.isMember && (!c.findings || !c.recommendation);

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {allowed.transitions.map((to) => {
          const action = c.status === "PENDING_APPROVAL" && to === "OPEN" ? "sendBack" : to;
          const primary = to === "PENDING_APPROVAL" || to === "APPROVED" || to === "REPORTED";
          return (
            <Button key={to} variant={primary ? "default" : "outline"} onClick={() => setTarget(to as Target)}>
              {t(`caseFlow.action.${action}`)}
            </Button>
          );
        })}
      </div>
      {ownCaseAwaitingApproval ? <p className="max-w-xs text-end text-xs text-text-secondary">{t("caseFlow.fourEyes")}</p> : null}
      {notReadyToSubmit ? <p className="max-w-xs text-end text-xs text-text-secondary">{t("caseFlow.notReady")}</p> : null}
      {target ? <TransitionDialog code={c.code} from={c.status} to={target} onClose={() => setTarget(null)} /> : null}
    </div>
  );
};
