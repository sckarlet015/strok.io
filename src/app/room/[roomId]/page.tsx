"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import RoomProviderWrapper from "@/components/RoomProvider";
import { saveRecentRoom } from "@/lib/utils";

const Canvas = dynamic(() => import("@/components/Canvas"), {
  ssr: false,
  loading: () => (
    <div className="w-screen h-screen bg-gray-900 animate-pulse" />
  ),
});

export default function RoomPage() {
  const params = useParams();
  const roomId = params.roomId as string;

  useEffect(() => {
    saveRecentRoom(roomId);
  }, [roomId]);

  return (
    <RoomProviderWrapper roomId={roomId}>
      <Canvas roomId={roomId} />
    </RoomProviderWrapper>
  );
}
