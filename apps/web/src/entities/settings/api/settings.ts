"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  defaultPreferences,
  preferencesSchema,
  systemSettingsSchema,
  type Preferences,
  type SystemSettings,
} from "@aml/shared";
import { del, post, request, upload } from "@/shared/api";
import { sessionKeys } from "@/entities/session/@x/settings";

export const mySettingsSchema = z.object({
  profile: z.object({ name: z.string(), email: z.string(), avatarUrl: z.string().nullable() }),
  preferences: preferencesSchema,
});
export type MySettings = z.infer<typeof mySettingsSchema>;

export const getMySettings = () => request("/settings/me", mySettingsSchema);
export const updateProfile = (input: { name: string }) =>
  request("/settings/profile", mySettingsSchema, { method: "PUT", body: JSON.stringify(input) });
export const uploadAvatar = (file: Blob) =>
  upload("/settings/avatar", mySettingsSchema, file, "avatar.jpg");
export const deleteAvatar = () => del("/settings/avatar", mySettingsSchema);
export const savePreferences = (p: Preferences) =>
  request("/settings/preferences", preferencesSchema, { method: "PUT", body: JSON.stringify(p) });
export const changePassword = (input: { current: string; next: string; confirm: string }) =>
  post("/settings/password", z.object({ endedSessions: z.number() }), input);
export const getSystemSettings = () => request("/settings/system", systemSettingsSchema);
export const saveSystemSettings = (s: SystemSettings) =>
  request("/settings/system", systemSettingsSchema, { method: "PUT", body: JSON.stringify(s) });

export const settingsKeys = {
  all: ["settings"] as const,
  me: () => ["settings", "me"] as const,
  system: () => ["settings", "system"] as const,
};

export const useMySettings = () =>
  useQuery({ queryKey: settingsKeys.me(), queryFn: getMySettings, staleTime: 5 * 60_000 });

/** The signed-in user's preferences, with defaults until they load. */
export const usePreferences = (): Preferences =>
  useMySettings().data?.preferences ?? defaultPreferences();

const useSetMe = () => {
  const qc = useQueryClient();
  return (data: MySettings) => {
    qc.setQueryData(settingsKeys.me(), data);
    // The app bar shows the name and photo from /auth/me.
    void qc.invalidateQueries({ queryKey: sessionKeys.me() });
  };
};
export const useUpdateProfile = () =>
  useMutation({ mutationFn: updateProfile, onSuccess: useSetMe() });
export const useUploadAvatar = () =>
  useMutation({ mutationFn: uploadAvatar, onSuccess: useSetMe() });
export const useDeleteAvatar = () =>
  useMutation({ mutationFn: deleteAvatar, onSuccess: useSetMe() });

export const useSavePreferences = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: savePreferences,
    // Applied at once (digits, density, sidebar); rolled back if the API refuses.
    onMutate: async (preferences) => {
      await qc.cancelQueries({ queryKey: settingsKeys.me() });
      const previous = qc.getQueryData<MySettings>(settingsKeys.me());
      if (previous) qc.setQueryData(settingsKeys.me(), { ...previous, preferences });
      return { previous };
    },
    onError: (_e, _v, ctx) => ctx?.previous && qc.setQueryData(settingsKeys.me(), ctx.previous),
  });
};

export const useChangePassword = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: changePassword,
    onSuccess: () => qc.invalidateQueries({ queryKey: sessionKeys.list() }),
  });
};

export const useSystemSettings = (enabled = true) =>
  useQuery({ queryKey: settingsKeys.system(), queryFn: getSystemSettings, enabled });
export const useSaveSystemSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveSystemSettings,
    onSuccess: (s) => qc.setQueryData(settingsKeys.system(), s),
  });
};
