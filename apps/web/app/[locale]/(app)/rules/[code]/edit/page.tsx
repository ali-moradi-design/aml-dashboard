import { Suspense } from "react";
import { RuleEditPage } from "@/_pages/rule-edit";

const Edit = async ({ params }: { params: Promise<{ code: string }> }) => (
  <RuleEditPage code={(await params).code} />
);

export default function Page({ params }: PageProps<"/[locale]/rules/[code]/edit">) {
  return (
    <Suspense>
      <Edit params={params} />
    </Suspense>
  );
}
