import { Liveblocks } from "@liveblocks/node";
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { generateRandomColor } from "@/lib/utils";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

export async function POST(request: NextRequest) {
  let sessionUserId: string;
  let name: string;

  // Check if request comes from Capacitor (no Clerk session)
  const host = request.headers.get("host") || "";
  const isCapacitor = host.includes("10.0.2.2") || host.includes("capacitor");

  if (isCapacitor) {
    // Guest mode for Capacitor
    sessionUserId = `guest-${request.headers.get("x-forwarded-for") || "mobile"}`;
    name = "Invitado";
  } else {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("No autorizado", { status: 401 });
    }
    sessionUserId = userId;
    const user = await currentUser();
    name =
      user?.firstName ??
      user?.emailAddresses?.[0]?.emailAddress ??
      "Anónimo";
  }

  const color = generateRandomColor();

  const session = liveblocks.prepareSession(sessionUserId, {
    userInfo: { name, color },
  });

  // Allow access to all rooms (prefix wildcard)
  const { room } = await request.json();
  if (room) {
    session.allow(room, session.FULL_ACCESS);
  }

  const { body, status } = await session.authorize();
  return new NextResponse(body, { status });
}
