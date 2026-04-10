"use client";

import { LiveObject } from "@liveblocks/client";
import { RoomProvider as LiveblocksRoomProvider } from "@/lib/liveblocks.config";
import { generateRandomColor, generateRandomName } from "@/lib/utils";

interface RoomProviderWrapperProps {
  roomId: string;
  children: React.ReactNode;
}

export default function RoomProviderWrapper({
  roomId,
  children,
}: RoomProviderWrapperProps) {
  return (
    <LiveblocksRoomProvider
      id={roomId}
      initialPresence={{
        cursor: null,
        name: generateRandomName(),
        color: generateRandomColor(),
        currentVote: null,
      }}
      initialStorage={{
        document: new LiveObject({ snapshot: "" }),
        meta: new LiveObject({ boardName: "Sin titulo" }),
        voting: new LiveObject({ session: "" }),
      }}
    >
      {children}
    </LiveblocksRoomProvider>
  );
}
