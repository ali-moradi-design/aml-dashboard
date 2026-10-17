import { systemSettingsSchema, type SystemSettings } from "@aml/shared";
import type { Db } from "../db/prisma";

const FALLBACK: SystemSettings = { baseCurrency: "EUR", highRiskCountries: ["XA", "XB", "XC"], alertSlaHours: { HIGH: 24, MEDIUM: 72, LOW: 120 } };

/** System-wide settings edited in admin; falls back to the defaults if nothing is stored yet. */
export const loadSystemSettings = async (db: Db): Promise<SystemSettings> => {
  const row = await db.systemSetting.findUnique({ where: { key: "system" } });
  return systemSettingsSchema.safeParse(row?.value).data ?? FALLBACK;
};
