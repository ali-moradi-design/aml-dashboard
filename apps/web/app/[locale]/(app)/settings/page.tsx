import { Suspense } from "react";
import { SettingsPage } from "@/_pages/settings";

export default function Page() {
  return (
    <Suspense>
      <SettingsPage />
    </Suspense>
  );
}
