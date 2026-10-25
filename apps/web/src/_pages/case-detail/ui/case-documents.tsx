"use client";

import { FileText, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { CaseDetail } from "@aml/shared";
import { documentUrl, useUploadDocument } from "@/entities/case";
import { useLocale } from "@/shared/i18n/use-locale";
import { formatDate } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { uploadLimitKey } from "@/shared/api";
import { MAX_DOCUMENT_BYTES } from "@/shared/config/uploads";

export const MAX_UPLOAD = MAX_DOCUMENT_BYTES;
export const ACCEPT = ".pdf,.png,.jpg,.jpeg,.csv,.xlsx,.docx,.txt";

export const formatSize = (bytes: number, locale: string) =>
  new Intl.NumberFormat(locale, {
    style: "unit",
    unit: bytes > 1_048_576 ? "megabyte" : "kilobyte",
    maximumFractionDigits: 1,
  }).format(bytes > 1_048_576 ? bytes / 1_048_576 : Math.max(bytes / 1024, 0.1));

/** Evidence files: drag and drop or pick, size checked before upload, downloads go through the API (access checked). */
export const CaseDocuments = ({ detail }: { detail: CaseDetail }) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const { case: c, documents, allowed } = detail;
  const upload = useUploadDocument();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const canUpload = allowed.edit || allowed.isMember;

  const send = (files: FileList | null) => {
    setError(null);
    for (const file of Array.from(files ?? [])) {
      if (file.size > MAX_UPLOAD) {
        setError(t("caseDetail.tooLarge", { name: file.name }));
        continue;
      }
      upload.mutate(
        { code: c.code, file },
        {
          onError: (e) =>
            setError(t(uploadLimitKey(e) ?? "caseDetail.uploadFailed", { name: file.name })),
        },
      );
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {documents.map((d) => (
          <li key={d.id}>
            <a
              href={documentUrl(c.code, d.id)}
              className="flex items-center gap-3 rounded-md p-1.5 hover:bg-muted"
            >
              <FileText className="size-4 shrink-0 text-text-secondary" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-link">{d.name}</span>
                <span className="text-xs text-text-secondary">
                  {formatSize(d.size, locale)} · {d.uploadedByName} ·{" "}
                  {formatDate(d.createdAt, locale)}
                </span>
              </span>
            </a>
          </li>
        ))}
        {!documents.length ? (
          <li className="text-sm text-text-secondary">{t("caseDetail.noDocuments")}</li>
        ) : null}
      </ul>
      {canUpload ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            send(e.dataTransfer.files);
          }}
          className={cn(
            "flex flex-col items-center gap-2 rounded-md border border-dashed border-border p-4 text-center text-xs text-text-secondary",
            over && "border-brand bg-brand-soft",
          )}
        >
          <span>{t("caseDetail.dropHint")}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={upload.isPending}
            onClick={() => input.current?.click()}
          >
            <Upload /> {upload.isPending ? t("caseDetail.uploading") : t("caseDetail.upload")}
          </Button>
          <input
            ref={input}
            type="file"
            multiple
            accept={ACCEPT}
            className="sr-only"
            onChange={(e) => {
              send(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="text-xs text-risk-high-text">
          {error}
        </p>
      ) : null}
    </div>
  );
};
