import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, isLocale, locales } from "@aml/shared";

const SESSION_COOKIE = "aml_session";

const pickLocale = (request: NextRequest) => {
  const saved = request.cookies.get("aml-locale")?.value;
  if (saved && isLocale(saved)) return saved;
  const accepted = request.headers.get("accept-language") ?? "";
  const match = accepted
    .split(",")
    .map((part) => part.split(";")[0]?.trim().slice(0, 2) ?? "")
    .find(isLocale);
  return match ?? defaultLocale;
};

/**
 * 1. Adds the locale prefix to every URL.
 * 2. Optimistic auth check: no session cookie → login page. The API still checks every request;
 *    this only avoids flashing a signed-in screen to a signed-out visitor.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const locale = locales.find((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));

  if (!locale) {
    const url = request.nextUrl.clone();
    url.pathname = `/${pickLocale(request)}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  const isLogin = pathname === `/${locale}/login`;
  const hasSession = request.cookies.has(SESSION_COOKIE);
  if (!hasSession && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|.*\\..*).*)"],
};
