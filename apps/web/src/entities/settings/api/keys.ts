import { z } from "zod";
import { preferencesSchema } from "@aml/shared";

// No "use client": server components read these too (session prefetch in the app layout).
export const mySettingsSchema = z.object({
  profile: z.object({ name: z.string(), email: z.string(), avatarUrl: z.string().nullable() }),
  preferences: preferencesSchema,
});
export type MySettings = z.infer<typeof mySettingsSchema>;

export const settingsKeys = {
  all: ["settings"] as const,
  me: () => ["settings", "me"] as const,
  system: () => ["settings", "system"] as const,
};
