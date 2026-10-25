"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { loginSchema, type LoginInput } from "@aml/shared";
import { LanguageSwitch } from "@/features/language-switch";
import { ThemeToggle } from "@/features/theme-toggle";
import { useLogin } from "@/entities/session";
import { getMySettings, settingsKeys } from "@/entities/settings";
import { isHttpError } from "@/shared/api";
import { useHref } from "@/shared/i18n/use-locale";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { LogoMark } from "@/shared/ui/logo-mark";

// Public demo accounts from the seed script (fictional people).
const DEMO_PASSWORD = "demo1234";
const demoAccounts = [
  { role: "ANALYST", name: "Lena Weber", city: "Berlin", email: "lena.weber@northbank.example" },
  {
    role: "SUPERVISOR",
    name: "Omar Haddad",
    city: "Dubai",
    email: "omar.haddad@northbank.example",
  },
  {
    role: "COMPLIANCE_MANAGER",
    name: "Elif Kaya",
    city: "Istanbul",
    email: "elif.kaya@northbank.example",
  },
  { role: "ADMIN", name: "James Carter", city: "London", email: "james.carter@northbank.example" },
] as const;

export const LoginPage = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useSearchParams();
  const href = useHref();
  const login = useLogin();
  const qc = useQueryClient();
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  // After sign-in: the page the user came from, otherwise the start page from their settings.
  const submit = (values: LoginInput) =>
    login.mutate(values, {
      onSuccess: async () => {
        const next = params?.get("next");
        if (next) return router.replace(next);
        const settings = await qc
          .fetchQuery({ queryKey: settingsKeys.me(), queryFn: getMySettings })
          .catch(() => null);
        router.replace(href(settings?.preferences.startPage ?? "/"));
      },
    });

  const serverError = login.error
    ? isHttpError(login.error) && login.error.status === 401
      ? t("login.wrongCredentials")
      : t("errors.generic")
    : null;

  return (
    <div className="grid min-h-dvh lg:grid-cols-[600px_1fr]">
      <aside className="hidden flex-col bg-[#00296b] p-14 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <LogoMark size={32} />
          <span className="text-xl">{t("app.name")}</span>
        </div>
        <div className="flex-1" />
        <h1 className="text-[32px] leading-10">{t("login.heroTitle")}</h1>
        <p className="mt-4 text-base text-[#c6dcf5]">{t("login.heroText")}</p>
        <dl className="mt-10 flex gap-8">
          {(["transactions", "alerts", "languages"] as const).map((k) => (
            <div key={k} className="flex flex-col-reverse">
              <dt className="text-xs text-[#c6dcf5]">{t(`login.stat.${k}.label`)}</dt>
              <dd className="text-[28px] leading-9">{t(`login.stat.${k}.value`)}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-12 text-xs text-[#c6dcf5]">{t("login.fictional")}</p>
      </aside>

      <main className="flex flex-col bg-page px-6 py-8 sm:px-12">
        <div className="flex justify-end gap-3">
          <ThemeToggle />
          <LanguageSwitch />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-9">
            <h2 className="text-2xl text-heading">{t("login.title")}</h2>
            <p className="mt-1.5 text-text-secondary">{t("login.subtitle")}</p>

            <form
              className="mt-6 flex flex-col gap-4"
              onSubmit={form.handleSubmit(submit)}
              noValidate
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">{t("login.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  placeholder="lena.weber@northbank.example"
                  aria-invalid={!!form.formState.errors.email}
                  {...form.register("email")}
                />
                {form.formState.errors.email ? (
                  <p className="text-xs text-risk-high-text">{t("login.emailInvalid")}</p>
                ) : null}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">{t("login.password")}</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={!!form.formState.errors.password}
                  {...form.register("password")}
                />
              </div>
              {serverError ? (
                <p
                  role="alert"
                  className="rounded-md bg-risk-high-bg px-3 py-2 text-sm text-risk-high-text"
                >
                  {serverError}
                </p>
              ) : null}
              <Button type="submit" size="lg" disabled={login.isPending}>
                {login.isPending ? t("login.signingIn") : t("login.signIn")}
              </Button>
            </form>

            <div className="my-6 flex items-center gap-3 text-xs text-text-secondary">
              <span className="h-px flex-1 bg-border" />
              {t("login.demoAccounts")}
              <span className="h-px flex-1 bg-border" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {demoAccounts.map((a) => (
                <button
                  key={a.email}
                  type="button"
                  disabled={login.isPending}
                  onClick={() => {
                    form.setValue("email", a.email);
                    form.setValue("password", DEMO_PASSWORD);
                    submit({ email: a.email, password: DEMO_PASSWORD });
                  }}
                  className="rounded-md border border-border bg-muted px-3.5 py-3 text-start transition-colors hover:border-brand hover:bg-brand-soft disabled:opacity-60"
                >
                  <span className="block text-text">{t(`role.${a.role}`)}</span>
                  <span className="block text-xs text-text-secondary">
                    {a.name} · {a.city}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-text-secondary">{t("login.footer")}</p>
      </main>
    </div>
  );
};
