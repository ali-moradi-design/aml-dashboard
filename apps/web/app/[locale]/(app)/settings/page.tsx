import { Suspense } from "react";
import { SettingsPage } from "@/pages/settings";

export default function Page() {
  return (
    <Suspense>
      <SettingsPage />
    </Suspense>
  );
}
