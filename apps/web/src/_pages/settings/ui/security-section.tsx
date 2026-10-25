"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LogOut, Monitor } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { passwordChangeSchema } from "@aml/shared";
import { useRevokeOtherSessions, useRevokeSession, useSessions } from "@/entities/session";
import { useChangePassword } from "@/entities/settings";
import { useLocale } from "@/shared/i18n/use-locale";
import { formatDateTime, formatNumber, formatRelative } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import { a11y, applyServerErrors, Field } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Panel, PanelHeader } from "@/shared/ui/panel";
import { Skeleton } from "@/shared/ui/skeleton";

type PasswordForm = { current: string; next: string; confirm: string };

/** "Chrome on Windows" from a user agent, good enough for a sessions list. */
const deviceOf = (ua: string | null) => {
  if (!ua) return null;
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Firefox\//.test(ua)
      ? "Firefox"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : /curl/i.test(ua)
            ? "curl"
            : null;
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Mac OS X/.test(ua)
      ? "macOS"
      : /Android/.test(ua)
        ? "Android"
        : /iPhone|iPad/.test(ua)
          ? "iOS"
          : /Linux/.test(ua)
            ? "Linux"
            : null;
  return [browser, os].filter(Boolean).join(" · ") || null;
};

const PasswordPanel = () => {
  const { t } = useTranslation();
  const locale = useLocale();
  const change = useChangePassword();
  const [ended, setEnded] = useState<number | null>(null);
  const form = useForm<PasswordForm>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: { current: "", next: "", confirm: "" },
  });
  const {
    register,
    formState: { errors },
  } = form;

  const submit = form.handleSubmit((v) => {
    setEnded(null);
    change.mutate(v, {
      onSuccess: (r) => {
        setEnded(r.endedSessions);
        form.reset();
      },
      onError: (e) => applyServerErrors(form, e),
    });
  });

  return (
    <Panel>
      <PanelHeader
        eyebrow={t("settings.security.password")}
        title={t("settings.security.passwordTitle")}
      />
      <form onSubmit={submit} noValidate className="grid max-w-md gap-4">
        <Field name="current" label={t("settings.security.current")} errors={errors} required>
          <Input
            type="password"
            autoComplete="current-password"
            {...a11y("current", errors)}
            {...register("current")}
          />
        </Field>
        <Field
          name="next"
          label={t("settings.security.next")}
          errors={errors}
          hint={t("settings.security.rules")}
          required
        >
          <Input
            type="password"
            autoComplete="new-password"
            {...a11y("next", errors)}
            {...register("next")}
          />
        </Field>
        <Field name="confirm" label={t("settings.security.confirm")} errors={errors} required>
          <Input
            type="password"
            autoComplete="new-password"
            {...a11y("confirm", errors)}
            {...register("confirm")}
          />
        </Field>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={change.isPending}>
            {change.isPending ? t("forms.saving") : t("settings.security.change")}
          </Button>
          {ended !== null ? (
            <span className="text-sm text-risk-low-text" role="status">
              {t("settings.security.changed", { count: ended, n: formatNumber(ended, locale) })}
            </span>
          ) : null}
        </div>
      </form>
    </Panel>
  );
};

const SessionsPanel = () => {
  const { t } = useTranslation();
  const locale = useLocale();
  const { data, isPending } = useSessions();
  const revoke = useRevokeSession();
  const revokeOthers = useRevokeOtherSessions();
  const others = (data ?? []).filter((s) => !s.current).length;

  return (
    <Panel>
      <PanelHeader
        eyebrow={t("settings.security.sessions")}
        title={t("settings.security.sessionsTitle", {
          count: others,
          n: formatNumber(others, locale),
        })}
        actions={
          others ? (
            <Button
              variant="outline"
              size="sm"
              disabled={revokeOthers.isPending}
              onClick={() => revokeOthers.mutate()}
            >
              <LogOut /> {t("settings.security.signOutOthers")}
            </Button>
          ) : null
        }
      />
      {isPending ? <Skeleton className="h-32" /> : null}
      <ul className="flex flex-col divide-y divide-border">
        {(data ?? []).map((s) => (
          <li key={s.id} className="flex items-center gap-3 py-3">
            <Monitor className="size-5 shrink-0 text-text-secondary" strokeWidth={1.5} />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-sm">
                {deviceOf(s.userAgent) ?? t("settings.security.unknownDevice")}
                {s.current ? (
                  <span className="rounded-full bg-risk-low-bg px-2 py-px text-xs text-risk-low-text">
                    {t("settings.security.thisDevice")}
                  </span>
                ) : null}
              </p>
              <p className="text-xs text-text-secondary">
                {s.ip ? <span className="ltr-nums font-mono">{s.ip}</span> : null}
                {s.ip ? " · " : null}
                {t("settings.security.signedIn", {
                  when: formatDateTime(s.createdAt, locale),
                })}{" "}
                · {t("settings.security.lastSeen", { when: formatRelative(s.lastSeenAt, locale) })}
              </p>
            </div>
            {!s.current ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={revoke.isPending}
                onClick={() => revoke.mutate(s.id)}
              >
                {t("settings.security.signOut")}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </Panel>
  );
};

export const SecuritySection = () => (
  <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
    <div className="xl:w-110 xl:shrink-0">
      <PasswordPanel />
    </div>
    <div className="min-w-0 flex-1">
      <SessionsPanel />
    </div>
  </div>
);
