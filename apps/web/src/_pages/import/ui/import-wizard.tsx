"use client";

import { CheckCircle2, Download, FileSpreadsheet, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { importFields, importKinds, type ImportBatch, type ImportKind } from "@aml/shared";
import { useCommitImport, useDiscardImport, useValidateImport } from "@/entities/import";
import { isHttpError } from "@/shared/api";
import { useLocale } from "@/shared/i18n/use-locale";
import { formatNumber } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Note, Panel, PanelHeader } from "@/shared/ui/panel";
import { Segmented } from "@/shared/ui/segmented";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Stepper } from "@/shared/ui/stepper";
import { autoMap, parseFile, templateCsv, tooManyRows, type ParsedFile } from "../model/parse";

const STEPS = ["file", "map", "preview", "check", "done"] as const;
const NONE = "__none";

const saveText = (text: string, name: string) => {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  Object.assign(document.createElement("a"), { href: url, download: name }).click();
  URL.revokeObjectURL(url);
};

/** File → column mapping → preview → server validation with row errors → commit. */
export const ImportWizard = () => {
  const { t } = useTranslation();
  const locale = useLocale();
  const n = (v: number) => formatNumber(v, locale);
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState<ImportKind>("customers");
  const [file, setFile] = useState<{ name: string; parsed: ParsedFile } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [batch, setBatch] = useState<ImportBatch | null>(null);
  const [imported, setImported] = useState<number | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const validate = useValidateImport();
  const commit = useCommitImport();
  const discard = useDiscardImport();

  const fields = importFields[kind];
  const missing = fields.filter((f) => f.required && !mapping[f.key]);
  const completed = new Set(Array.from({ length: step }, (_, i) => i));

  const reset = () => {
    setStep(0);
    setFile(null);
    setMapping({});
    setBatch(null);
    setImported(null);
    validate.reset();
    if (input.current) input.current.value = "";
  };

  const choose = async (f: File | undefined) => {
    setFileError(null);
    if (!f) return;
    if (!/\.(csv|xlsx)$/i.test(f.name)) return setFileError(t("import.wrongType"));
    try {
      const parsed = await parseFile(f);
      if (!parsed.rows.length) return setFileError(t("errors.noRows"));
      if (tooManyRows(parsed)) return setFileError(t("errors.tooManyRows"));
      setFile({ name: f.name, parsed });
      setMapping(autoMap(kind, parsed.headers));
      setStep(1);
    } catch {
      setFileError(t("import.unreadable"));
    }
  };

  const check = () =>
    file &&
    validate.mutate(
      { kind, fileName: file.name, mapping: Object.fromEntries(Object.entries(mapping).filter(([, h]) => h)), rows: file.parsed.rows },
      { onSuccess: (b) => { setBatch(b); setStep(3); } },
    );

  const preview = file?.parsed.rows.slice(0, 8) ?? [];

  return (
    <Panel>
      <Stepper steps={STEPS.map((s) => ({ key: s, label: t(`import.steps.${s}`) }))} current={step} completed={completed} onSelect={(i) => i < step && step < 3 && setStep(i)} />

      {step === 0 ? (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-sm">{t("import.kind")}</span>
              <Segmented label={t("import.kind")} value={kind} onChange={setKind} options={importKinds.map((k) => ({ value: k, label: t(`import.kinds.${k}`) }))} />
            </div>
            <Button variant="outline" onClick={() => saveText(templateCsv(kind), `${kind}-template.csv`)}><Download /> {t("import.template")}</Button>
          </div>
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); void choose(e.dataTransfer.files[0]); }}
            className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed border-border px-6 py-14 text-center hover:border-brand focus-within:border-brand"
          >
            <Upload className="size-8 text-text-secondary" strokeWidth={1.5} />
            <span className="text-base">{t("import.drop")}</span>
            <span className="text-sm text-text-secondary">{t("import.dropHint")}</span>
            <input ref={input} type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={(e) => void choose(e.target.files?.[0])} />
          </label>
          {fileError ? <Note tone="danger">{fileError}</Note> : null}
          <Note>{t(`import.kindHint.${kind}`)}</Note>
        </div>
      ) : null}

      {step === 1 && file ? (
        <div className="flex flex-col gap-5">
          <PanelHeader eyebrow={t("import.mapEyebrow", { file: file.name })} title={t("import.mapTitle", { count: file.parsed.rows.length, n: n(file.parsed.rows.length) })} />
          <div className="grid gap-x-6 gap-y-3 md:grid-cols-2">
            {fields.map((f) => (
              <div key={f.key} className="grid grid-cols-[1fr_1.2fr] items-center gap-3">
                <label htmlFor={`map-${f.key}`} className="text-sm">
                  {t(`import.fields.${f.key}`)}
                  {f.required ? <span className="text-risk-high-text" aria-hidden> *</span> : null}
                </label>
                <Select value={mapping[f.key] || NONE} onValueChange={(v) => setMapping((m) => ({ ...m, [f.key]: v === NONE ? "" : v }))}>
                  <SelectTrigger id={`map-${f.key}`} aria-invalid={f.required && !mapping[f.key]} className={cn(f.required && !mapping[f.key] && "border-risk-high")}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{t("import.notMapped")}</SelectItem>
                    {file.parsed.headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          {missing.length ? <Note tone="danger">{t("import.missing", { fields: missing.map((f) => t(`import.fields.${f.key}`)).join(", ") })}</Note> : null}
          <div className="flex justify-between gap-2">
            <Button variant="outline" onClick={reset}>{t("import.otherFile")}</Button>
            <Button disabled={missing.length > 0} onClick={() => setStep(2)}>{t("forms.next")}</Button>
          </div>
        </div>
      ) : null}

      {step === 2 && file ? (
        <div className="flex flex-col gap-5">
          <PanelHeader eyebrow={t("import.previewEyebrow")} title={t("import.previewTitle", { shown: n(preview.length), count: file.parsed.rows.length, n: n(file.parsed.rows.length) })} />
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-[13px]">
              <thead className="bg-muted">
                <tr>
                  <th className="h-9 px-3 text-start text-xs font-normal text-text-secondary">{t("import.row")}</th>
                  {fields.filter((f) => mapping[f.key]).map((f) => <th key={f.key} className="h-9 px-3 text-start text-xs font-normal whitespace-nowrap text-text-secondary">{t(`import.fields.${f.key}`)}</th>)}
                </tr>
              </thead>
              <tbody>
                {preview.map((r, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-2 text-text-secondary">{n(i + 2)}</td>
                    {fields.filter((f) => mapping[f.key]).map((f) => <td key={f.key} className="max-w-56 truncate px-3 py-2">{String(r[mapping[f.key]!] ?? "")}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {validate.error ? <Note tone="danger">{isHttpError(validate.error) && validate.error.status === 400 ? t("import.rejected") : t("errors.generic")}</Note> : null}
          <div className="flex justify-between gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>{t("forms.back")}</Button>
            <Button disabled={validate.isPending} onClick={check}>{validate.isPending ? t("import.checking") : t("import.check")}</Button>
          </div>
        </div>
      ) : null}

      {step === 3 && batch ? (
        <div className="flex flex-col gap-5">
          <PanelHeader
            eyebrow={t("import.checkEyebrow")}
            title={batch.errorRows ? t("import.checkErrors", { count: batch.errorRows, n: n(batch.errorRows), valid: n(batch.validRows) }) : t("import.checkOk", { count: batch.validRows, n: n(batch.validRows) })}
          />
          <div className="grid grid-cols-3 gap-3">
            {[
              [batch.totalRows, t("import.total"), ""],
              [batch.validRows, t("import.valid"), "text-risk-low-text"],
              [batch.errorRows, t("import.invalid"), batch.errorRows ? "text-risk-high-text" : ""],
            ].map(([v, label, cls]) => (
              <div key={String(label)} className="rounded-md bg-muted px-4 py-3">
                <p className={cn("text-2xl", String(cls))}>{n(Number(v))}</p>
                <p className="text-xs text-text-secondary">{label}</p>
              </div>
            ))}
          </div>
          {batch.errors.length ? (
            <div className="max-h-80 overflow-y-auto rounded-md border border-border">
              <table className="w-full text-[13px]">
                <thead className="sticky top-0 bg-muted">
                  <tr>{["row", "field", "problem"].map((c) => <th key={c} className="h-9 px-3 text-start text-xs font-normal text-text-secondary">{t(`import.${c}`)}</th>)}</tr>
                </thead>
                <tbody>
                  {batch.errors.slice(0, 200).map((e, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-2">{n(e.row)}</td>
                      <td className="px-3 py-2">{t(`import.fields.${e.field}`, { defaultValue: e.field })}</td>
                      <td className="px-3 py-2 text-risk-high-text">{t(e.message, { defaultValue: e.message })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {batch.errorRows && batch.validRows ? <Note>{t("import.partialHint")}</Note> : null}
          <div className="flex justify-between gap-2">
            <Button variant="outline" disabled={discard.isPending} onClick={() => discard.mutate(batch.id, { onSuccess: reset })}>{t("import.discard")}</Button>
            <Button disabled={!batch.validRows || commit.isPending} onClick={() => commit.mutate(batch.id, { onSuccess: (r) => { setImported(r.imported); setStep(4); } })}>
              {commit.isPending ? t("import.importing") : t("import.commit", { count: batch.validRows, n: n(batch.validRows) })}
            </Button>
          </div>
        </div>
      ) : null}

      {step === 4 && imported !== null ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <CheckCircle2 className="size-10 text-risk-low" strokeWidth={1.5} />
          <p className="text-lg">{t("import.doneTitle", { count: imported, n: n(imported) })}</p>
          <p className="text-sm text-text-secondary">{t(`import.doneHint.${kind}`)}</p>
          <Button variant="outline" className="mt-2" onClick={reset}><FileSpreadsheet /> {t("import.another")}</Button>
        </div>
      ) : null}
    </Panel>
  );
};
