import { createClient, LiveObject } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

const client = createClient({
  authEndpoint: "/api/liveblocks-auth",
});

export type VotingSession = {
  id: string;
  type: "approval" | "stars" | "dot";
  question: string;
  options: string[];
  votes: Record<string, string | number>;
  createdBy: string;
  createdByName: string;
  createdAt: number;
  closedAt: number | null;
  linkedShapeIds: string[];
};

type Presence = {
  cursor: { x: number; y: number } | null;
  name: string;
  color: string;
  currentVote: string | null;
};

type Storage = {
  document: LiveObject<{ snapshot: string }>;
  meta: LiveObject<{ boardName: string }>;
  voting: LiveObject<{ session: string }>;
};

export const {
  RoomProvider,
  useMyPresence,
  useUpdateMyPresence,
  useOthers,
  useSelf,
  useStorage,
  useMutation,
  useRoom,
  useBroadcastEvent,
  useEventListener,
} = createRoomContext<Presence, Storage>(client);
