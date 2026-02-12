/**
 * Middleware: protect dashboard routes and enforce role-based access.
 * Public: /, /login, /register, /forgot-password, /reset-password, /courses, /api/auth/*
 */
import { auth } from "@/lib/auth";

const publicPaths = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/courses",
];
const authPrefix = "/api/auth";

function isPublic(pathname: string): boolean {
  if (pathname.startsWith(authPrefix)) return true;
  if (publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/")))
    return true;
  // Course detail pages are public for browsing
  if (/^\/courses\/[^/]+$/.test(pathname)) return true;
  return false;
}

function isAdmin(pathname: string): boolean {
  return pathname.startsWith("/admin");
}
function isAuthor(pathname: string): boolean {
  return pathname.startsWith("/author");
}
function isStudent(pathname: string): boolean {
  return pathname.startsWith("/dashboard");
}

export default auth((req) => {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;
  const session = req.auth;

  if (isPublic(pathname)) {
    return;
  }

  if (!session?.user) {
    const login = new URL("/login", nextUrl.origin);
    login.searchParams.set("callbackUrl", pathname);
    return Response.redirect(login);
  }

  const role = session.user.role;

  if (isAdmin(pathname) && role !== "ADMIN") {
    return Response.redirect(new URL("/unauthorized", nextUrl.origin));
  }
  if (isAuthor(pathname) && role !== "AUTHOR" && role !== "ADMIN") {
    return Response.redirect(new URL("/unauthorized", nextUrl.origin));
  }
  if (isStudent(pathname)) {
    if (role === "AUTHOR") return Response.redirect(new URL("/author", nextUrl.origin));
    if (role !== "STUDENT" && role !== "ADMIN") {
      return Response.redirect(new URL("/unauthorized", nextUrl.origin));
    }
  }

  return;
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/author/:path*",
    "/profile/:path*",
    "/courses/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ],
};
