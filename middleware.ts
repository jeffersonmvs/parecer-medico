import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "hcw_session";

// Public paths that never require a session.
const PUBLIC = ["/login"];

async function hasValidSession(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const authed = await hasValidSession(req);

  // Root → route based on auth.
  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(authed ? "/inicio" : "/login", req.url),
    );
  }

  const isPublic = PUBLIC.some((p) => pathname.startsWith(p));

  if (isPublic) {
    // Signed-in users shouldn't sit on the login page.
    if (authed) return NextResponse.redirect(new URL("/inicio", req.url));
    return NextResponse.next();
  }

  if (!authed) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Protect app pages; skip Next internals, API routes (self-guarded),
  // and static assets.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons|.*\\.png$).*)",
  ],
};
