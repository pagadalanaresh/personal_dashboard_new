import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "dasboard_session";
const PUBLIC_PATHS = ["/login", "/signup", "/admin/login"];

async function getSessionClaims(request: NextRequest): Promise<{ role?: string } | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return payload as { role?: string };
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.includes(pathname);
  // The standalone admin portal has its own login/session boundary — an
  // unauthenticated or non-admin visitor should bounce to /admin/login,
  // never the regular /login.
  const isAdminArea = pathname.startsWith("/admin") && pathname !== "/admin/login";
  const claims = await getSessionClaims(request);
  const authenticated = claims !== null;

  if (!authenticated && !isPublicPath) {
    const loginPath = isAdminArea ? "/admin/login" : "/login";
    const loginUrl = new URL(loginPath, request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (authenticated && isAdminArea && claims?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  if (authenticated && isPublicPath) {
    const destination =
      pathname === "/admin/login" ? (claims?.role === "ADMIN" ? "/admin/users" : "/dashboard") : "/dashboard";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
