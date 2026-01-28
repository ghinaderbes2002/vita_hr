import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const publicPages = ["/login", "/forgot-password"];

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const isPublicPage = publicPages.some((page) => pathname.includes(page));

  // Simple token check - just check if wso-token cookie exists and has a value
  const token = request.cookies.get("wso-token")?.value;
  const isAuthenticated = !!token && token.length > 10; // JWT tokens are much longer than 10 chars

  if (!isAuthenticated && !isPublicPage) {
    const locale = pathname.split("/")[1] || "ar";
    if (routing.locales.includes(locale as any)) {
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
    }
    return NextResponse.redirect(new URL(`/ar/login`, request.url));
  }

  if (isAuthenticated && isPublicPage) {
    const locale = pathname.split("/")[1] || "ar";
    if (routing.locales.includes(locale as any)) {
      return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
    }
    return NextResponse.redirect(new URL(`/ar/dashboard`, request.url));
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
