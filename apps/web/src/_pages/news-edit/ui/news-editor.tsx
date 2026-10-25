"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus, Paperclip, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { newsInputSchema, roleKeys, type NewsDetail, type NewsInput } from "@aml/shared";
import { useSaveNews, useUploadNewsFile } from "@/entities/news";
import { useReference } from "@/entities/reference";
import { apiUrl, uploadLimitKey } from "@/shared/api";
import { MAX_DOCUMENT_BYTES } from "@/shared/config/uploads";
import { useHref } from "@/shared/i18n/use-locale";
import { useUnsavedGuard } from "@/shared/lib/use-unsaved-guard";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { a11y, applyServerErrors, ErrorSummary, Field, fieldId } from "@/shared/ui/form";
import { ImageCropDialog } from "@/shared/ui/image-crop-dialog";
import { Input } from "@/shared/ui/input";
import { Note, Panel, PanelHeader } from "@/shared/ui/panel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { RichText } from "./rich-text";

/** datetime-local works in local time; the API gets ISO timestamps. */
const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};
const toIso = (local: string) => (local ? new Date(local).toISOString() : "");

type Upload = { id: string; name: string; size: number };

export const NewsEditor = ({ post }: { post?: NewsDetail }) => {
  const { t } = useTranslation();
  const href = useHref();
  const router = useRouter();
  const { data: ref } = useReference();
  const save = useSaveNews();
  const uploadFile = useUploadNewsFile();
  const [attempts, setAttempts] = useState(0);
  const [saved, setSaved] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(
    post?.coverUrl ? apiUrl(post.coverUrl) : null,
  );
  const [files, setFiles] = useState<Upload[]>(post?.attachments ?? []);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  const form = useForm<NewsInput>({
    resolver: zodResolver(newsInputSchema) as Resolver<NewsInput>,
    defaultValues: {
      title: post?.title ?? "",
      body: post?.body ?? "",
      audienceRoles: post?.audienceRoles ?? [],
      audienceRegionIds: post?.audienceRegionIds ?? [],
      minClearance: post?.minClearance ?? 1,
      publishAt: toLocalInput(post?.publishAt ?? new Date().toISOString()),
      expiresAt: toLocalInput(post?.expiresAt ?? null) || null,
      pinned: post?.pinned ?? false,
      coverId: post?.coverId ?? null,
      attachmentIds: post?.attachments.map((a) => a.id) ?? [],
    },
  });
  const {
    register,
    control,
    formState: { errors, isDirty },
    setValue,
  } = form;
  useUnsavedGuard(isDirty && !saved, t("forms.unsavedConfirm"));

  const submit = form.handleSubmit(
    (v) =>
      save.mutate(
        {
          ...v,
          id: post?.id,
          publishAt: toIso(v.publishAt),
          expiresAt: v.expiresAt ? toIso(v.expiresAt) : null,
          attachmentIds: files.map((f) => f.id),
        },
        {
          onSuccess: ({ id }) => {
            setSaved(true);
            router.push(href(`/news/${id}`));
          },
          onError: (e) => {
            applyServerErrors(form, e);
            setAttempts((a) => a + 1);
          },
        },
      ),
    () => setAttempts((a) => a + 1),
  );

  const addFiles = (list: FileList | null) => {
    setUploadError(null);
    for (const file of Array.from(list ?? [])) {
      if (file.size > MAX_DOCUMENT_BYTES) {
        setUploadError(t("caseDetail.tooLarge", { name: file.name }));
        continue;
      }
      uploadFile.mutate(
        { file, kind: "file" },
        {
          onSuccess: (u) =>
            setFiles((f) => {
              const next = [...f, u];
              setValue(
                "attachmentIds",
                next.map((y) => y.id),
                { shouldDirty: true },
              );
              return next;
            }),
          onError: (e) =>
            setUploadError(t(uploadLimitKey(e) ?? "caseDetail.uploadFailed", { name: file.name })),
        },
      );
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <ErrorSummary errors={errors} submitCount={attempts} />
      <div className="flex flex-col gap-6 xl:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <Panel>
            <Field name="title" label={t("newsEditor.title")} errors={errors} required>
              <Input className="text-lg" {...a11y("title", errors)} {...register("title")} />
            </Field>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm">{t("newsEditor.cover")}</span>
              {coverUrl ? (
                <div className="relative overflow-hidden rounded-md border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element -- served by the API with the session cookie */}
                  <img src={coverUrl} alt="" className="aspect-video w-full object-cover" />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="absolute inset-e-2 top-2 bg-card"
                    onClick={() => {
                      setCoverUrl(null);
                      setValue("coverId", null, { shouldDirty: true });
                    }}
                  >
                    <X /> {t("forms.remove")}
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => coverInput.current?.click()}
                  className="flex aspect-21/6 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border text-sm text-text-secondary hover:bg-muted"
                >
                  <ImagePlus className="size-5" /> {t("newsEditor.addCover")}
                </button>
              )}
              <input
                ref={coverInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(e) => {
                  setCropFile(e.target.files?.[0] ?? null);
                  e.target.value = "";
                }}
              />
            </div>
            <Field name="body" label={t("newsEditor.body")} errors={errors} required>
              <Controller
                control={control}
                name="body"
                render={({ field }) => (
                  <RichText
                    value={field.value}
                    onChange={field.onChange}
                    placeholder={t("newsEditor.bodyPlaceholder")}
                    invalid={Boolean(errors.body)}
                    id={fieldId("body")}
                    describedBy={errors.body ? `${fieldId("body")}-error` : undefined}
                  />
                )}
              />
            </Field>
            <div className="flex flex-col gap-2">
              <span className="text-sm">{t("newsEditor.attachments")}</span>
              <ul className="flex flex-wrap gap-2">
                {files.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center gap-1.5 rounded-full bg-muted py-1 ps-3 pe-1 text-xs"
                  >
                    <Paperclip className="size-3" /> {f.name}
                    <button
                      type="button"
                      aria-label={t("forms.remove")}
                      onClick={() => {
                        const next = files.filter((y) => y.id !== f.id);
                        setFiles(next);
                        setValue(
                          "attachmentIds",
                          next.map((y) => y.id),
                          { shouldDirty: true },
                        );
                      }}
                      className="rounded-full p-0.5 hover:bg-border"
                    >
                      <X className="size-3" />
                    </button>
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit"
                disabled={uploadFile.isPending}
                onClick={() => fileInput.current?.click()}
              >
                <Paperclip />{" "}
                {uploadFile.isPending ? t("caseDetail.uploading") : t("newsEditor.addFile")}
              </Button>
              <input
                ref={fileInput}
                type="file"
                multiple
                className="sr-only"
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              {uploadError ? (
                <p role="alert" className="text-xs text-risk-high-text">
                  {uploadError}
                </p>
              ) : null}
            </div>
          </Panel>
        </div>

        <div className="flex w-full flex-col gap-6 xl:w-90 xl:shrink-0">
          <Panel>
            <PanelHeader eyebrow={t("newsEditor.publishing")} />
            <Field
              name="publishAt"
              label={t("newsEditor.publishAt")}
              errors={errors}
              required
              hint={t("newsEditor.publishHint")}
            >
              <Input
                type="datetime-local"
                dir="ltr"
                {...a11y("publishAt", errors)}
                {...register("publishAt")}
              />
            </Field>
            <Field name="expiresAt" label={t("newsEditor.expiresAt")} errors={errors}>
              <Input
                type="datetime-local"
                dir="ltr"
                {...a11y("expiresAt", errors)}
                {...register("expiresAt", { setValueAs: (v: string) => v || null })}
              />
            </Field>
            <Controller
              control={control}
              name="pinned"
              render={({ field }) => (
                <label className="flex items-start gap-2 text-sm">
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(v) => field.onChange(v === true)}
                    className="mt-0.5"
                  />
                  <span>
                    {t("newsEditor.pinned")}
                    <span className="block text-xs text-text-secondary">
                      {t("newsEditor.pinnedHint")}
                    </span>
                  </span>
                </label>
              )}
            />
          </Panel>
          <Panel>
            <PanelHeader eyebrow={t("newsEditor.audience")} title={t("newsEditor.audienceHint")} />
            <Controller
              control={control}
              name="audienceRoles"
              render={({ field }) => (
                <fieldset className="flex flex-col gap-1.5">
                  <legend className="mb-1.5 text-xs text-text-secondary">
                    {t("newsEditor.roles")}
                  </legend>
                  {roleKeys.map((r) => (
                    <label key={r} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={field.value.includes(r)}
                        onCheckedChange={(on) =>
                          field.onChange(
                            on ? [...field.value, r] : field.value.filter((x) => x !== r),
                          )
                        }
                      />
                      {t(`role.${r}`)}
                    </label>
                  ))}
                </fieldset>
              )}
            />
            <Controller
              control={control}
              name="audienceRegionIds"
              render={({ field }) => (
                <fieldset className="flex flex-col gap-1.5">
                  <legend className="mb-1.5 text-xs text-text-secondary">
                    {t("newsEditor.regions")}
                  </legend>
                  {(ref?.regions ?? []).map((r) => (
                    <label key={r.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={field.value.includes(r.id)}
                        onCheckedChange={(on) =>
                          field.onChange(
                            on ? [...field.value, r.id] : field.value.filter((x) => x !== r.id),
                          )
                        }
                      />
                      {t(`region.${r.code}`, { defaultValue: r.name })}
                    </label>
                  ))}
                </fieldset>
              )}
            />
            <Field name="minClearance" label={t("newsEditor.minClearance")} errors={errors}>
              <Controller
                control={control}
                name="minClearance"
                render={({ field }) => (
                  <Select
                    value={String(field.value)}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4].map((r) => (
                        <SelectItem key={r} value={String(r)}>
                          {t(`clearance.${r}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Note>{t("newsEditor.notifyHint")}</Note>
          </Panel>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              {t("forms.cancel")}
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending
                ? t("forms.saving")
                : post
                  ? t("forms.save")
                  : t("newsEditor.publish")}
            </Button>
          </div>
        </div>
      </div>
      <ImageCropDialog
        file={cropFile}
        aspect={16 / 9}
        title={t("newsEditor.cropCover")}
        onCancel={() => setCropFile(null)}
        onDone={(blob) => {
          const name = cropFile?.name.replace(/\.\w+$/, ".jpg") ?? "cover.jpg";
          setCropFile(null);
          uploadFile.mutate(
            { file: blob, kind: "cover", name },
            {
              onSuccess: (u) => {
                setCoverUrl(apiUrl(u.url));
                setValue("coverId", u.id, { shouldDirty: true });
              },
              onError: (e) =>
                setUploadError(t(uploadLimitKey(e) ?? "caseDetail.uploadFailed", { name })),
            },
          );
        }}
      />
    </form>
  );
};
