import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const accessToken = request.cookies.get("access_token")
  const { pathname } = request.nextUrl

  /**
   * ✅ PUBLIC ROUTES (NO AUTH REQUIRED)
   * Signing links must always be accessible
   */
  const publicRoutes = [
    "/contracts/sign",
    "/contracts/admin-signing",
    "/sign/complete",
  ]

  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  )

  if (isPublicRoute) {
    return NextResponse.next()
  }

  /**
   * 🔒 PROTECTED ROUTES
   */
  const protectedRoutes = [
    "/projects",
    "/eoi",
    "/proposals",
    "/contracts",
    "/settings",
    "/payment",
  ]

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  )

  // Redirect unauthenticated users trying to access protected routes
  if (isProtectedRoute && !accessToken) {
    const homeUrl = new URL("/", request.url)
    homeUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(homeUrl)
  }

  /**
   * 🔁 AUTH ROUTES (redirect logged-in users away)
   */
  const authRoutes = [
    "/partner/login",
    "/admin/login",
    "/partner/sign-up",
  ]

  const isAuthRoute = authRoutes.some((route) =>
    pathname.startsWith(route)
  )

  if (isAuthRoute && accessToken) {
    return NextResponse.redirect(new URL("/projects", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icons|avatars).*)",
  ],
}
