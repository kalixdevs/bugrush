import { NextResponse, type NextRequest } from "next/server";

const SEEN_COOKIE = "devrace_seen";

function hasSessionCookie(req: NextRequest): boolean {
  // Better Auth's session cookie name typically starts with "better-auth".
  // Check permissively so we don't break if the name shifts.
  for (const c of req.cookies.getAll()) {
    if (c.name.startsWith("better-auth") || c.name.includes("session_token")) {
      return true;
    }
  }
  return false;
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // Welcome escape hatch: always show landing, refresh the seen cookie.
  if (url.searchParams.get("welcome") === "1") {
    const res = NextResponse.next();
    res.cookies.set(SEEN_COOKIE, "1", {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return res;
  }

  // Logged-in users go straight to /home.
  if (hasSessionCookie(req)) {
    const dest = url.clone();
    dest.pathname = "/home";
    dest.search = "";
    return NextResponse.redirect(dest);
  }

  // Returning visitors go to /home.
  if (req.cookies.get(SEEN_COOKIE)) {
    const dest = url.clone();
    dest.pathname = "/home";
    dest.search = "";
    return NextResponse.redirect(dest);
  }

  // First visit: show landing, set the cookie.
  const res = NextResponse.next();
  res.cookies.set(SEEN_COOKIE, "1", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return res;
}

export const config = {
  matcher: ["/"],
};
