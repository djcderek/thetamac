import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Routes that require authentication
const protectedRoutes = [
  "/dashboard",
  "/settings",
  "/shop",
  "/stats",
];

// Routes that should redirect to home if already authenticated
const authRoutes = ["/auth/signin", "/auth/signup"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") || "";

  // Redirect apex domain (thetamac.com) to www (www.thetamac.com)
  if (
    host === "thetamac.com" &&
    process.env.NODE_ENV === "production"
  ) {
    const wwwUrl = new URL(request.url);
    wwwUrl.host = "www.thetamac.com";
    return NextResponse.redirect(wwwUrl, 308); // 308 = permanent redirect preserving method
  }

  // Get the session token
  // Note: We use getToken instead of auth() because auth() uses Prisma
  // in callbacks, and Prisma doesn't work in Vercel's Edge Runtime
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    // Ensure we're using the correct cookie name for production
    secureCookie: process.env.NODE_ENV === "production",
  });

  const isAuthenticated = !!token;

  // Check if the current path is a protected route
  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // Check if the current path is an auth route
  const isAuthRoute = authRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // Redirect unauthenticated users trying to access protected routes
  if (isProtectedRoute && !isAuthenticated) {
    const signInUrl = new URL("/auth/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Redirect authenticated users away from auth routes
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  /*
   * Match all paths except:
   * - API routes (/api/*)
   * - Static files (/_next/static/*, /_next/image/*, /favicon.ico)
   * - Public assets (files with extensions like .svg, .png, .glb)
   * - Models directory (/models/*)
   */
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|models|.*\\.[\\w]+$).*)",
  ],
};
