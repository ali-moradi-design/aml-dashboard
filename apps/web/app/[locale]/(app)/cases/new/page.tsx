import { Suspense } from "react";
import { CaseNewPage } from "@/_pages/case-new";

const Wizard = async ({ searchParams }: { searchParams: Promise<{ alert?: string }> }) => (
  <CaseNewPage fromAlert={(await searchParams).alert} />
);

export default function Page({ searchParams }: PageProps<"/[locale]/cases/new">) {
  return (
    <Suspense>
      <Wizard searchParams={searchParams as Promise<{ alert?: string }>} />
    </Suspense>
  );
}
