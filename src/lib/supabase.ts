import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface SessionRecord {
  id: string;
  room_id: string;
  user_id: string;
  snapshots: CanvasSnapshot[];
  created_at: string;
}

export interface CanvasSnapshot {
  timestamp: number;
  userId: string;
  userName: string;
  userColor: string;
  store: Record<string, unknown>;
  isKeyframe?: boolean;
  keyframeName?: string;
}

export async function saveSessionToSupabase(
  roomId: string,
  userId: string,
  snapshots: CanvasSnapshot[]
) {
  console.log(`[Supabase] Saving ${snapshots.length} snapshots for room ${roomId}`);

  // Use API route instead of direct client (handles auth & RLS)
  try {
    const { apiUrl } = await import("./api-config");
    const res = await fetch(apiUrl("/api/save-snapshots"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room_id: roomId, user_id: userId, snapshots }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error("[Supabase] Error saving session:", data.error || res.status);
    } else {
      console.log("[Supabase] Saved successfully");
    }
  } catch (err) {
    console.error("[Supabase] Error saving session:", err);
  }
}

export async function loadSessionFromSupabase(
  roomId: string
): Promise<CanvasSnapshot[]> {
  const { data, error } = await supabase
    .from("sessions")
    .select("snapshots")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });

  if (error) console.error("[Supabase] Error loading sessions:", error);
  if (!data || data.length === 0) {
    console.log("[Supabase] No sessions found for room", roomId);
    return [];
  }
  console.log(`[Supabase] Loaded ${data.length} session rows for room ${roomId}`);

  // Merge all sessions chronologically
  const all: CanvasSnapshot[] = [];
  for (const row of data) {
    const snaps = row.snapshots as CanvasSnapshot[];
    if (Array.isArray(snaps)) all.push(...snaps);
  }
  all.sort((a, b) => a.timestamp - b.timestamp);
  return all;
}
