"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { profileSchema } from "@aml/shared";
import { useMe } from "@/entities/session";
import { useDeleteAvatar, useMySettings, useUpdateProfile, useUploadAvatar } from "@/entities/settings";
import { apiUrl } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { a11y, applyServerErrors, Field } from "@/shared/ui/form";
import { ImageCropDialog } from "@/shared/ui/image-crop-dialog";
import { Input } from "@/shared/ui/input";
import { Note, Panel, PanelHeader } from "@/shared/ui/panel";

const initials = (name: string) => name.split(" ").map((p) => p[0]).slice(0, 2).join("");

export const ProfileSection = () => {
  const { t } = useTranslation();
  const { data: me } = useMe();
  const { data } = useMySettings();
  const update = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const deleteAvatar = useDeleteAvatar();
  const [crop, setCrop] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const form = useForm<{ name: string }>({ resolver: zodResolver(profileSchema), values: { name: data?.profile.name ?? "" } });
  const { register, formState: { errors, isDirty } } = form;
  if (!data || !me) return null;

  const submit = form.handleSubmit((v) => {
    setSaved(false);
    update.mutate(v, { onSuccess: () => setSaved(true), onError: (e) => applyServerErrors(form, e) });
  });

  return (
    <Panel>
      <PanelHeader eyebrow={t("settings.profile.eyebrow")} title={t("settings.profile.title")} />
      <div className="flex flex-wrap items-center gap-5">
        {data.profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- served by the API with the session cookie
          <img src={apiUrl(data.profile.avatarUrl)} alt={t("settings.profile.photo")} className="size-20 rounded-full object-cover" />
        ) : (
          <span className="grid size-20 place-items-center rounded-full bg-brand-soft text-xl text-heading dark:bg-brand dark:text-on-brand" aria-hidden>{initials(data.profile.name)}</span>
        )}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" disabled={uploadAvatar.isPending} onClick={() => picker.current?.click()}><Camera /> {uploadAvatar.isPending ? t("caseDetail.uploading") : t("settings.profile.change")}</Button>
            {data.profile.avatarUrl ? <Button variant="ghost" size="sm" disabled={deleteAvatar.isPending} onClick={() => deleteAvatar.mutate()}><Trash2 /> {t("forms.remove")}</Button> : null}
          </div>
          <p className="text-xs text-text-secondary">{t("settings.profile.photoHint")}</p>
          <input
            ref={picker}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              setPhotoError(null);
              if (f && f.size > 10 * 1024 * 1024) return setPhotoError(t("settings.profile.tooLarge"));
              if (f) setCrop(f);
            }}
          />
        </div>
      </div>
      {photoError || uploadAvatar.isError ? <Note tone="danger">{photoError ?? t("settings.profile.uploadFailed")}</Note> : null}

      <form onSubmit={submit} noValidate className="grid max-w-2xl gap-4 sm:grid-cols-2">
        <Field name="name" label={t("settings.profile.name")} errors={errors} required>
          <Input autoComplete="name" {...a11y("name", errors)} {...register("name")} />
        </Field>
        <Field name="email" label={t("settings.profile.email")} errors={{}} hint={t("settings.profile.emailHint")}>
          <Input id="field-email" value={data.profile.email} readOnly disabled dir="ltr" />
        </Field>
        <div className="flex items-center gap-3 sm:col-span-2">
          <Button type="submit" disabled={!isDirty || update.isPending}>{update.isPending ? t("forms.saving") : t("forms.save")}</Button>
          {saved && !isDirty ? <span className="text-sm text-risk-low-text" role="status">{t("settings.saved")}</span> : null}
        </div>
      </form>

      <dl className="grid max-w-2xl gap-3 border-t border-border pt-4 text-sm sm:grid-cols-3">
        <div><dt className="text-xs text-text-secondary">{t("settings.profile.role")}</dt><dd>{t(`role.${me.role}`)}</dd></div>
        <div><dt className="text-xs text-text-secondary">{t("settings.profile.regions")}</dt><dd>{me.regions.map((r) => r.name).join(", ")}</dd></div>
        <div><dt className="text-xs text-text-secondary">{t("settings.profile.clearance")}</dt><dd>{t("user.clearance", { rank: me.clearanceRank })}</dd></div>
      </dl>
      <p className="text-xs text-text-secondary">{t("settings.profile.managedByAdmin")}</p>

      <ImageCropDialog
        file={crop}
        aspect={1}
        round
        maxWidth={512}
        title={t("settings.profile.cropTitle")}
        onCancel={() => setCrop(null)}
        onDone={(blob) => {
          setCrop(null);
          uploadAvatar.mutate(blob);
        }}
      />
    </Panel>
  );
};
