"use client";

import { Lock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNote, useSaveNote } from "@/entities/case";
import { useLocale } from "@/shared/i18n/use-locale";
import { formatRelative } from "@/shared/lib/format";
import { Textarea } from "@/shared/ui/textarea";

/** Private scratchpad: one per user and case, saved a second after typing stops. */
export const CaseNote = ({ code }: { code: string }) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const { data } = useNote(code, true);
  const save = useSaveNote();
  const [body, setBody] = useState<string | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (data && !loaded.current) {
      loaded.current = true;
      setBody(data.body);
    }
  }, [data]);

  useEffect(() => {
    if (body === null || body === data?.body) return;
    const id = setTimeout(() => save.mutate({ code, body }), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- save on text change only
  }, [body]);

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        rows={5}
        value={body ?? ""}
        disabled={body === null}
        onChange={(e) => setBody(e.target.value)}
        placeholder={t("caseDetail.notePlaceholder")}
        aria-label={t("caseDetail.note")}
      />
      <p className="flex items-center gap-1.5 text-xs text-text-secondary" aria-live="polite">
        <Lock className="size-3" />
        {save.isPending
          ? t("forms.saving")
          : data?.updatedAt
            ? t("caseDetail.noteSaved", { when: formatRelative(data.updatedAt, locale) })
            : t("caseDetail.notePrivate")}
      </p>
    </div>
  );
};
