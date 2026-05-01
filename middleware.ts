export { default } from "next-auth/middleware"

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/missing/:path*",
    "/teacher/:path*",
    "/coordinator/:path*",
    "/counselor/:path*",
    "/dean/:path*",
    "/admin/:path*",
    "/staff/:path*",
    "/student/:path*",
    "/design-lab/:path*",
  ],
}
