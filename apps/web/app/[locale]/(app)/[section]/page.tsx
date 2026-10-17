import { notFound } from "next/navigation";
import { upcomingSections } from "@/shared/config/navigation";
import { ComingSoonPage } from "@/pages/coming-soon";

const sections = upcomingSections.map((s) => s.path.slice(1));

export const generateStaticParams = () => sections.map((section) => ({ section }));

export default async function Page({ params }: PageProps<"/[locale]/[section]">) {
  const { section } = await params;
  if (!sections.includes(section)) notFound();
  return <ComingSoonPage section={section} />;
}
