import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, isLocale, locales } from "@aml/shared";

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

/** Sends every URL without a locale prefix to /{locale}/... */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasLocale = locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (hasLocale) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `/${pickLocale(request)}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|.*\\..*).*)"],
};
