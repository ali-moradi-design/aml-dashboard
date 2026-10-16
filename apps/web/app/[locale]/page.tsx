import { isLocale } from "@aml/shared";
import { notFound } from "next/navigation";
import { OverviewPage } from "@/pages/overview";

export default async function Page({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <OverviewPage locale={locale} />;
}
