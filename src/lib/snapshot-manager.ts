import { Editor } from "tldraw";
import { CanvasSnapshot, saveSessionToSupabase } from "./supabase";

const MAX_SNAPSHOTS = 500;
const SNAPSHOT_INTERVAL_MS = 3000;
const SAVE_TO_SUPABASE_EVERY = 3;

let intervalId: ReturnType<typeof setInterval> | null = null;
let snapshots: CanvasSnapshot[] = [];
let currentRoomId: string = "";
let currentUserId: string = "";
let paused: boolean = false;
let snapshotsSinceLastSave = 0;
let currentEditor: Editor | null = null;
let currentUserName: string = "";
let currentUserColor: string = "";

export function getSnapshots(): CanvasSnapshot[] {
  return snapshots;
}

export function startSnapshotRecording(
  editor: Editor,
  roomId: string,
  userId: string,
  userName: string,
  userColor: string
) {
  if (intervalId && currentRoomId === roomId) return;

  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }

  if (currentRoomId !== roomId) {
    snapshots = [];
    snapshotsSinceLastSave = 0;
  }

  currentRoomId = roomId;
  currentUserId = userId;
  currentEditor = editor;
  currentUserName = userName;
  currentUserColor = userColor;

  let lastSnapshotJson = "";

  intervalId = setInterval(() => {
    if (paused) return;
    const storeSnapshot = editor.store.getStoreSnapshot("document");
    const snapshotJson = JSON.stringify(storeSnapshot);

    if (snapshotJson === lastSnapshotJson) return;
    lastSnapshotJson = snapshotJson;

    const snapshot: CanvasSnapshot = {
      timestamp: Date.now(),
      userId,
      userName,
      userColor,
      store: storeSnapshot as unknown as Record<string, unknown>,
      isKeyframe: false,
    };

    snapshots.push(snapshot);

    if (snapshots.length > MAX_SNAPSHOTS) {
      snapshots = snapshots.slice(-MAX_SNAPSHOTS);
    }

    snapshotsSinceLastSave++;
    if (snapshotsSinceLastSave >= SAVE_TO_SUPABASE_EVERY) {
      saveToSupabase();
    }
  }, SNAPSHOT_INTERVAL_MS);
}

export function forceSnapshot() {
  if (!currentEditor || !currentRoomId) return;
  const storeSnapshot = currentEditor.store.getStoreSnapshot("document");

  const snapshot: CanvasSnapshot = {
    timestamp: Date.now(),
    userId: currentUserId,
    userName: currentUserName,
    userColor: currentUserColor,
    store: storeSnapshot as unknown as Record<string, unknown>,
    isKeyframe: false,
  };

  snapshots.push(snapshot);
  if (snapshots.length > MAX_SNAPSHOTS) {
    snapshots = snapshots.slice(-MAX_SNAPSHOTS);
  }
}

export function markKeyframe(name?: string) {
  if (!currentEditor || !currentRoomId) return;

  const storeSnapshot = currentEditor.store.getStoreSnapshot("document");

  const snapshot: CanvasSnapshot = {
    timestamp: Date.now(),
    userId: currentUserId,
    userName: currentUserName,
    userColor: currentUserColor,
    store: storeSnapshot as unknown as Record<string, unknown>,
    isKeyframe: true,
    keyframeName: name || undefined,
  };

  snapshots.push(snapshot);

  if (snapshots.length > MAX_SNAPSHOTS) {
    snapshots = snapshots.slice(-MAX_SNAPSHOTS);
  }

  saveToSupabase();
}

export function stopSnapshotRecording() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

export function pauseSnapshotRecording() {
  paused = true;
}

export function resumeSnapshotRecording() {
  paused = false;
}

function saveToSupabase() {
  if (snapshots.length > 0 && currentRoomId && currentUserId) {
    snapshotsSinceLastSave = 0;
    saveSessionToSupabase(currentRoomId, currentUserId, snapshots);
  }
}

// Use sendBeacon for reliable saving on page unload
function saveViaBeacon() {
  if (snapshots.length === 0 || !currentRoomId || !currentUserId) return;
  const payload = JSON.stringify({
    room_id: currentRoomId,
    user_id: currentUserId,
    snapshots,
  });
  navigator.sendBeacon("/api/save-snapshots", new Blob([payload], { type: "application/json" }));
}

export function saveAndStop() {
  stopSnapshotRecording();
  saveViaBeacon();
}
