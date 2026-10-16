import type { Locale } from "@aml/shared";
import { ThemeToggle } from "@/features/theme-toggle";
import { getT } from "@/shared/i18n";
import { SystemStatus } from "@/widgets/system-status";

/** Placeholder overview until the real screen from Figma is built. */
export const OverviewPage = ({ locale }: { locale: Locale }) => {
  const t = getT(locale);
  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-8 py-7">
      <header className="flex items-end gap-3">
        <div className="flex-1">
          <h1 className="text-2xl text-heading">{t("overview.title")}</h1>
          <p className="mt-1 text-text-secondary">{t("overview.subtitle")}</p>
        </div>
        <ThemeToggle />
      </header>
      <SystemStatus />
    </main>
  );
};
