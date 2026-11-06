import { LoginPage } from "@/_pages/login";

// No request data (the `next` parameter is read on submit), so the whole page is prerendered.
export default function Page() {
  return <LoginPage />;
}
