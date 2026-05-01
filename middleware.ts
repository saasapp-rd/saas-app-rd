export { default } from "next-auth/middleware"

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/teacher/:path*",
    "/coordinator/:path*",
    "/counselor/:path*",
    "/dean/:path*",
    "/admin/:path*",
    "/staff/:path*",
    "/design-lab/:path*",
  ],
}
