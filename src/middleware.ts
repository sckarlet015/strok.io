import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/liveblocks-auth",
  "/api/save-snapshots",
]);

function isCapacitorRequest(request: NextRequest): boolean {
  const host = request.headers.get("host") || "";
  const origin = request.headers.get("origin") || "";
  const referer = request.headers.get("referer") || "";
  return (
    host.includes("10.0.2.2") ||
    host.includes("capacitor") ||
    origin.includes("10.0.2.2") ||
    origin.includes("capacitor://") ||
    referer.includes("10.0.2.2")
  );
}

const clerkMw = clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export default function middleware(request: NextRequest) {
  // Bypass Clerk entirely for Capacitor WebView requests
  if (isCapacitorRequest(request)) {
    return NextResponse.next();
  }
  return clerkMw(request, {} as never);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
