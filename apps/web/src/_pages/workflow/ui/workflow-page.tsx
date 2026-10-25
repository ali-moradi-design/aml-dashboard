"use client";

import { GitBranch, Pencil, Rocket, Save, Trash2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { validateWorkflow, type WorkflowGraph, type WorkflowVersionRow } from "@aml/shared";
import { WorkflowDesigner } from "@/features/workflow-designer";
import { useCan } from "@/entities/session";
import { useCreateWorkflowDraft, useDiscardWorkflowDraft, usePublishWorkflow, useSaveWorkflowDraft, useWorkflow, useWorkflowVersion } from "@/entities/workflow";
import { isHttpError } from "@/shared/api";
import { useLocale } from "@/shared/i18n/use-locale";
import { formatDate, formatNumber, formatRelative } from "@/shared/lib/format";
import { useUnsavedGuard } from "@/shared/lib/use-unsaved-guard";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Note, PageHeader, Panel, PanelHeader } from "@/shared/ui/panel";
import { Skeleton } from "@/shared/ui/skeleton";

const statusClass: Record<WorkflowVersionRow["status"], string> = {
  DRAFT: "bg-risk-medium-bg text-risk-medium-text",
  PUBLISHED: "bg-risk-low-bg text-risk-low-text",
  ARCHIVED: "bg-muted text-text-secondary",
};

export const WorkflowPage = () => {
  const { t } = useTranslation();
  const locale = useLocale();
  const can = useCan();
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const params = useSearchParams();
  const overview = useWorkflow("case");
  const versions = overview.data?.versions ?? [];
  const draft = versions.find((v) => v.status === "DRAFT");
  const published = versions.find((v) => v.status === "PUBLISHED");
  const selectedId = params?.get("v") ?? draft?.id ?? published?.id ?? null;
  const version = useWorkflowVersion(selectedId);
  const createDraft = useCreateWorkflowDraft();
  const save = useSaveWorkflowDraft();
  const discard = useDiscardWorkflowDraft();
  const publish = usePublishWorkflow();

  // Local edits of the open version; reset whenever another version (or a fresh save) loads.
  const loadedKey = version.data ? `${version.data.id}:${version.data.updatedAt}` : "";
  const [edit, setEdit] = useState<{ key: string; graph: WorkflowGraph; note: string } | null>(null);
  if (version.data && edit?.key !== loadedKey) setEdit({ key: loadedKey, graph: version.data.graph, note: version.data.note ?? "" });
  const graph = edit?.graph ?? version.data?.graph;
  const isDraft = version.data?.status === "DRAFT";
  const dirty = Boolean(isDraft && version.data && edit && (JSON.stringify(edit.graph) !== JSON.stringify(version.data.graph) || edit.note !== (version.data.note ?? "")));
  const issues = graph ? validateWorkflow(graph) : [];
  const [error, setError] = useState<string | null>(null);
  useUnsavedGuard(dirty, t("forms.unsavedConfirm"));

  const open = (id: string) => {
    if (dirty && !window.confirm(t("forms.unsavedConfirm"))) return;
    router.replace(`${pathname}?v=${id}`, { scroll: false });
  };

  const saveDraft = async () => {
    if (!version.data || !edit) return;
    setError(null);
    await save.mutateAsync({ id: version.data.id, graph: edit.graph, note: edit.note || undefined });
  };

  const doPublish = async () => {
    if (!version.data) return;
    setError(null);
    try {
      if (dirty) await saveDraft();
      const res = await publish.mutateAsync(version.data.id);
      router.replace(`${pathname}?v=${res.id}`, { scroll: false });
    } catch (e) {
      setError(isHttpError(e) ? e.message : t("errors.generic"));
    }
  };

  if (!can("workflow.manage")) return <Panel><p>{t("workflow.noPermission")}</p></Panel>;
  if (overview.isPending || (selectedId && version.isPending)) return <Skeleton className="h-[640px]" />;
  if (overview.isError || !version.data || !graph) return <Panel><p>{t("errors.generic")}</p></Panel>;

  const v = version.data;
  const olderOpen = versions.filter((x) => x.status === "ARCHIVED").reduce((s, x) => s + x.openCases, 0);

  const header = (
    <>
      <Panel className="gap-3 p-5">
        <PanelHeader eyebrow={t("workflow.versions")} title={published ? t("workflow.publishedVersion", { version: formatNumber(published.version, locale) }) : undefined} />
        <ul className="flex flex-col gap-1.5">
          {versions.map((x) => (
            <li key={x.id}>
              <button
                type="button"
                aria-current={x.id === v.id ? "true" : undefined}
                onClick={() => open(x.id)}
                className={cn("flex w-full items-center gap-2 rounded-md border px-3 py-2 text-start text-sm", x.id === v.id ? "border-brand bg-brand-soft" : "border-border hover:bg-muted")}
              >
                <GitBranch className="size-3.5 text-text-secondary" />
                <span className="flex-1">{t("workflow.versionN", { n: formatNumber(x.version, locale) })}</span>
                {x.openCases ? <span className="text-xs text-text-secondary">{t("workflow.openCases", { count: x.openCases, n: formatNumber(x.openCases, locale) })}</span> : null}
                <span className={cn("rounded-full px-2 py-0.5 text-xs", statusClass[x.status])}>{t(`workflow.status.${x.status}`)}</span>
              </button>
            </li>
          ))}
        </ul>
        {!draft ? (
          <Button variant="outline" disabled={createDraft.isPending} onClick={() => createDraft.mutate("case", { onSuccess: ({ id }) => open(id) })}>
            <Pencil /> {t("workflow.newVersion")}
          </Button>
        ) : !isDraft ? (
          <Button variant="outline" onClick={() => open(draft.id)}><Pencil /> {t("workflow.openDraft")}</Button>
        ) : null}
      </Panel>

      <Panel className="gap-3 p-5">
        <PanelHeader
          eyebrow={t("workflow.versionN", { n: formatNumber(v.version, locale) })}
          title={t(`workflow.statusLong.${v.status}`, { date: v.publishedAt ? formatDate(v.publishedAt, locale) : "", by: v.publishedByName ?? v.createdByName })}
        />
        {isDraft ? (
          <>
            <Input value={edit?.note ?? ""} onChange={(e) => setEdit((x) => (x ? { ...x, note: e.target.value } : x))} placeholder={t("workflow.notePlaceholder")} aria-label={t("workflow.note")} maxLength={200} />
            <p className="text-xs text-text-secondary" aria-live="polite">
              {save.isPending ? t("forms.saving") : dirty ? t("workflow.unsaved") : t("workflow.savedAt", { when: formatRelative(v.updatedAt, locale) })}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" disabled={!dirty || save.isPending} onClick={() => void saveDraft()}><Save /> {t("forms.save")}</Button>
              <Button disabled={issues.length > 0 || publish.isPending} onClick={() => void doPublish()}><Rocket /> {t("workflow.publish")}</Button>
              <Button
                variant="ghost"
                className="text-risk-high-text"
                disabled={discard.isPending}
                onClick={() => window.confirm(t("workflow.discardConfirm")) && discard.mutate(v.id, { onSuccess: () => router.replace(pathname, { scroll: false }) })}
              >
                <Trash2 /> {t("workflow.discard")}
              </Button>
            </div>
            {issues.length ? <p className="text-xs text-text-secondary">{t("workflow.fixBeforePublish")}</p> : <Note>{t("workflow.publishHint", { next: formatNumber(v.version, locale) })}</Note>}
            {error ? <Note tone="danger">{error}</Note> : null}
          </>
        ) : (
          <>
            {v.note ? <p className="text-sm">{v.note}</p> : null}
            <p className="text-sm text-text-secondary">{t("workflow.casesOnVersion", { open: v.openCases, total: formatNumber(v.totalCases, locale) })}</p>
          </>
        )}
      </Panel>
    </>
  );

  return (
    <>
      <PageHeader
        title={t("workflow.title")}
        subtitle={published ? t("workflow.subtitle", { version: formatNumber(published.version, locale), since: formatDate(published.publishedAt ?? published.updatedAt, locale), older: olderOpen }) : undefined}
      />
      <WorkflowDesigner
        key={v.id}
        graph={graph}
        onChange={(g) => setEdit((x) => (x ? { ...x, graph: g } : x))}
        readOnly={!isDraft}
        stepLoad={v.stepLoad}
        header={header}
      />
    </>
  );
};
