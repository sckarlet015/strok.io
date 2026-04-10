"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { Tldraw, TLComponents, Editor, TLRecord, inlineBase64AssetStore } from "tldraw";
import "tldraw/tldraw.css";
import { useUpdateMyPresence, useStorage, useMutation, useSelf } from "@/lib/liveblocks.config";
import CollaborativeCursors from "./CollaborativeCursors";
import RoomHeader from "./RoomHeader";
import PlaybackPanel from "./PlaybackPanel";
import VotingPanel from "./VotingPanel";
import SidePanel from "./SidePanel";
import MenuBar from "./MenuBar";
import { startSnapshotRecording, stopSnapshotRecording, saveAndStop, pauseSnapshotRecording, resumeSnapshotRecording, forceSnapshot } from "@/lib/snapshot-manager";
import { createPrivateStore, publishToSharedCanvas } from "@/lib/focus-mode";
import Draggable from "./Draggable";
import { useIsMobile } from "@/lib/useIsMobile";

interface CanvasProps {
  roomId: string;
}

const components: TLComponents = {
  MenuPanel: null,
};

export default function Canvas({ roomId }: CanvasProps) {
  const updateMyPresence = useUpdateMyPresence();
  const snapshot = useStorage((root) => root.document?.snapshot);
  const self = useSelf();
  const editorRef = useRef<Editor | null>(null);
  const isRemoteUpdateRef = useRef(false);
  const isPlaybackRef = useRef(false);
  const prePlaybackSnapshotRef = useRef<string | null>(null);
  const [showPlayback, setShowPlayback] = useState(false);
  const [editorReady, setEditorReady] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [focusOpacity, setFocusOpacity] = useState(0.3);
  const privateEditorRef = useRef<Editor | null>(null);

  const isMobile = useIsMobile();
  const selfId = self?.id?.toString() ?? null;
  const selfName = self?.presence.name ?? null;
  const selfColor = self?.presence.color ?? null;

  // Create private store for focus mode (memoized per user)
  const privateStore = useMemo(() => {
    if (!selfId) return null;
    return createPrivateStore(selfId);
  }, [selfId]);

  const updateSnapshot = useMutation(({ storage }, newSnapshot: string) => {
    storage.get("document").set("snapshot", newSnapshot);
  }, []);

  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;
      setEditorReady(true);

      const removeListener = editor.store.listen(
        () => {
          if (isRemoteUpdateRef.current || isPlaybackRef.current) return;

          const docSnapshot = editor.store.getStoreSnapshot("document");
          updateSnapshot(JSON.stringify(docSnapshot));
        },
        { source: "user", scope: "document" }
      );

      return () => {
        removeListener();
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Start snapshot recording when editor and self are ready
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !editorReady || !selfId || !selfName || !selfColor) return;

    startSnapshotRecording(editor, roomId, selfId, selfName, selfColor);

    const handleBeforeUnload = () => {
      saveAndStop();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      stopSnapshotRecording();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, editorReady, selfId]);

  // Sync remote changes from Liveblocks -> tldraw editor (document records only)
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !snapshot || showPlayback) return;

    try {
      const parsed = JSON.parse(snapshot);
      const remoteRecords: TLRecord[] = Object.values(parsed.store ?? {});

      isRemoteUpdateRef.current = true;

      const localRecords = editor.store.allRecords();
      const localDocIds = new Set(
        localRecords
          .filter((r) => r.typeName !== "instance" && r.typeName !== "instance_page_state" && r.typeName !== "camera" && r.typeName !== "pointer")
          .map((r) => r.id)
      );

      const remoteDocRecords = remoteRecords.filter(
        (r) => r.typeName !== "instance" && r.typeName !== "instance_page_state" && r.typeName !== "camera" && r.typeName !== "pointer"
      );
      const remoteDocIds = new Set(remoteDocRecords.map((r) => r.id));

      if (remoteDocRecords.length > 0) {
        editor.store.put(remoteDocRecords);
      }

      const toRemove = [...localDocIds].filter((id) => !remoteDocIds.has(id));
      if (toRemove.length > 0) {
        editor.store.remove(toRemove);
      }

      isRemoteUpdateRef.current = false;
    } catch {
      isRemoteUpdateRef.current = false;
    }
  }, [snapshot, showPlayback]);

  // Track cursor position
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      updateMyPresence({ cursor: { x: e.clientX, y: e.clientY } });
    };

    const handlePointerLeave = () => {
      updateMyPresence({ cursor: null });
    };

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [updateMyPresence]);

  // Sync camera between public and private editors
  useEffect(() => {
    const publicEditor = editorRef.current;
    const privateEditor = privateEditorRef.current;
    if (!isFocusMode || !publicEditor || !privateEditor) return;

    // Initial sync: copy public camera to private
    const publicCamera = publicEditor.getCamera();
    privateEditor.setCamera(publicCamera);

    // Sync public -> private when public camera changes
    const removePublicListener = publicEditor.store.listen(
      () => {
        const cam = publicEditor.getCamera();
        const privateCam = privateEditor.getCamera();
        if (cam.x !== privateCam.x || cam.y !== privateCam.y || cam.z !== privateCam.z) {
          privateEditor.setCamera(cam);
        }
      },
      { source: "all", scope: "session" }
    );

    // Sync private -> public when private camera changes
    const removePrivateListener = privateEditor.store.listen(
      () => {
        const cam = privateEditor.getCamera();
        const publicCam = publicEditor.getCamera();
        if (cam.x !== publicCam.x || cam.y !== publicCam.y || cam.z !== publicCam.z) {
          publicEditor.setCamera(cam);
        }
      },
      { source: "all", scope: "session" }
    );

    return () => {
      removePublicListener();
      removePrivateListener();
    };
  }, [isFocusMode, editorReady]);

  const handlePublish = useCallback(() => {
    const editor = editorRef.current;
    if (!editor || !privateStore) return;
    publishToSharedCanvas(privateStore, editor);
    setIsFocusMode(false);
  }, [privateStore]);

  const handleTogglePlayback = useCallback(() => {
    const next = !showPlayback;
    const editor = editorRef.current;
    if (next && editor) {
      forceSnapshot();
      prePlaybackSnapshotRef.current = JSON.stringify(editor.store.getStoreSnapshot("document"));
      isPlaybackRef.current = true;
      pauseSnapshotRecording();
    } else if (!next && editor && prePlaybackSnapshotRef.current) {
      isPlaybackRef.current = true;
      try {
        const parsed = JSON.parse(prePlaybackSnapshotRef.current);
        const records = Object.values(parsed.store ?? {}) as TLRecord[];
        const docRecords = records.filter(
          (r) => r.typeName !== "instance" && r.typeName !== "instance_page_state" && r.typeName !== "camera" && r.typeName !== "pointer"
        );
        const remoteDocIds = new Set(docRecords.map((r) => r.id));
        const localDocIds = editor.store.allRecords()
          .filter((r) => r.typeName !== "instance" && r.typeName !== "instance_page_state" && r.typeName !== "camera" && r.typeName !== "pointer")
          .map((r) => r.id);
        const toRemove = localDocIds.filter((id) => !remoteDocIds.has(id));
        if (toRemove.length > 0) editor.store.remove(toRemove);
        if (docRecords.length > 0) editor.store.put(docRecords);
      } catch {}
      prePlaybackSnapshotRef.current = null;
      isPlaybackRef.current = false;
      resumeSnapshotRecording();
    }
    setShowPlayback(next);
  }, [showPlayback]);

  // Wait for storage to be loaded
  if (snapshot === null) {
    return (
      <div className="w-screen h-screen bg-gray-900 animate-pulse" />
    );
  }

  const menuBarHeight = isMobile ? 44 : 36;
  const bottomBarHeight = isMobile ? 62 : 0;

  return (
    <div style={{ width: "100vw", height: "100dvh", position: "relative", overflow: "hidden" }}>
      {/* Top menu bar */}
      <MenuBar
        editor={editorRef.current}
        roomId={roomId}
        onTogglePlayback={handleTogglePlayback}
        onToggleFocus={() => setIsFocusMode(!isFocusMode)}
        isFocusMode={isFocusMode}
      />

      {/* Public canvas (below menu bar, above bottom bar on mobile) */}
      <div style={{
        width: "100%",
        height: `calc(100% - ${menuBarHeight}px - ${bottomBarHeight}px)`,
        marginTop: menuBarHeight,
        opacity: isFocusMode ? focusOpacity : 1,
        transition: "opacity 0.3s",
      }}>
        <Tldraw
          licenseKey={process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY}
          components={components}
          persistenceKey={roomId}
          onMount={handleMount}
          assets={inlineBase64AssetStore}
        />
      </div>

      {/* Focus mode: private canvas overlay */}
      {isFocusMode && privateStore && (
        <div
          className="focus-overlay"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 400,
          }}
        >
          <div style={{ position: "relative", width: "100%", height: "100%", zIndex: 1 }}>
            <Tldraw
              licenseKey={process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY}
              store={privateStore}
              onMount={(editor) => { privateEditorRef.current = editor; }}
            />
          </div>
          {/* Border glow to indicate focus mode */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              zIndex: 0,
              boxShadow: "inset 0 0 40px rgba(249, 115, 22, 0.15)",
              border: "2px solid rgba(249, 115, 22, 0.4)",
              borderRadius: 0,
            }}
          />
          {/* CSS to make private tldraw background transparent */}
          <style>{`
            .focus-overlay .tl-background { background: transparent !important; }
            .focus-overlay .tl-canvas { background: transparent !important; }
            .focus-overlay [data-testid="tldraw-canvas"] { background: transparent !important; }
          `}</style>
          {/* Focus mode badge */}
          <div
            style={{
              position: "absolute",
              top: 12,
              left: "50%",
              transform: "translateX(-50%)",
              backgroundColor: "rgba(249, 115, 22, 0.95)",
              color: "white",
              padding: "6px 16px",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              zIndex: 2,
              pointerEvents: "none",
              boxShadow: "0 2px 12px rgba(249, 115, 22, 0.4)",
            }}
          >
            Modo Foco — Solo tu puedes ver esto
          </div>
          {/* Exit + Publish + Opacity controls */}
          <div
            style={{
              position: "absolute",
              top: isMobile ? 56 : 50,
              left: isMobile ? 8 : 16,
              right: isMobile ? 8 : "auto",
              display: "flex",
              gap: 8,
              alignItems: "center",
              justifyContent: isMobile ? "center" : "flex-start",
              zIndex: 2,
            }}
          >
            <button
              onClick={() => setIsFocusMode(false)}
              style={{
                padding: "8px 20px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 500,
                backgroundColor: "rgba(255,255,255,0.9)",
                color: "#374151",
                boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
              }}
            >
              Salir
            </button>
            <button
              onClick={handlePublish}
              style={{
                padding: "8px 20px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                backgroundColor: "#3b82f6",
                color: "white",
                boxShadow: "0 2px 12px rgba(59,130,246,0.4)",
              }}
            >
              Publicar al canvas
            </button>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                backgroundColor: "rgba(255,255,255,0.9)",
                padding: "4px 12px",
                borderRadius: 8,
                boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
              }}
            >
              <span style={{ fontSize: 11, color: "#6b7280", whiteSpace: "nowrap" }}>Canvas</span>
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(focusOpacity * 100)}
                onChange={(e) => setFocusOpacity(Number(e.target.value) / 100)}
                style={{ width: 80, cursor: "pointer" }}
              />
              <span style={{ fontSize: 11, color: "#6b7280", minWidth: 28 }}>{Math.round(focusOpacity * 100)}%</span>
            </div>
          </div>
        </div>
      )}

      <CollaborativeCursors />

      {/* Room header (top center) */}
      {isMobile ? (
        <div style={{
          position: "absolute",
          top: menuBarHeight + 4,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 200,
        }}>
          <RoomHeader onTogglePlayback={handleTogglePlayback} showPlayback={showPlayback} />
        </div>
      ) : (
        <Draggable id="room-header" defaultPosition={{ x: window.innerWidth / 2 - 150, y: 44 }}>
          <RoomHeader onTogglePlayback={handleTogglePlayback} showPlayback={showPlayback} />
        </Draggable>
      )}

      {/* Unified side panel */}
      <SidePanel
        editor={editorRef.current}
        isFocusMode={isFocusMode}
        onToggleFocus={() => setIsFocusMode(!isFocusMode)}
        onPublishFocus={handlePublish}
        showPlayback={showPlayback}
        onTogglePlayback={handleTogglePlayback}
      />

      {/* Voting panel (shown when active session) */}
      {isMobile ? (
        <div style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 500,
          width: "90vw",
          maxWidth: 360,
        }}>
          <VotingPanel editor={editorRef.current} />
        </div>
      ) : (
        <Draggable id="voting-panel" defaultPosition={{ x: window.innerWidth / 2 - 160, y: window.innerHeight / 2 - 200 }}>
          <VotingPanel editor={editorRef.current} />
        </Draggable>
      )}

      {/* Playback panel */}
      {showPlayback && (
        isMobile ? (
          <div style={{
            position: "fixed",
            bottom: bottomBarHeight,
            left: 0,
            right: 0,
            zIndex: 320,
            padding: "0 8px 8px",
          }}>
            <PlaybackPanel
              roomId={roomId}
              editor={editorRef.current}
              onClose={() => { setShowPlayback(false); resumeSnapshotRecording(); }}
            />
          </div>
        ) : (
          <Draggable id="playback-panel" defaultPosition={{ x: window.innerWidth - 316, y: 60 }}>
            <PlaybackPanel
              roomId={roomId}
              editor={editorRef.current}
              onClose={() => { setShowPlayback(false); resumeSnapshotRecording(); }}
            />
          </Draggable>
        )
      )}
    </div>
  );
}
