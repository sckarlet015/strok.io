"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import * as Slider from "@radix-ui/react-slider";
import { Editor, TLRecord } from "tldraw";
import { CanvasSnapshot, loadSessionFromSupabase } from "@/lib/supabase";
import { getSnapshots } from "@/lib/snapshot-manager";

interface PlaybackPanelProps {
  roomId: string;
  editor: Editor | null;
  onClose: () => void;
}

const SPEEDS = [1, 2, 4, 8];

type PlaybackMode = "full" | "summary";

export default function PlaybackPanel({ roomId, editor, onClose }: PlaybackPanelProps) {
  const [allSnapshots, setAllSnapshots] = useState<CanvasSnapshot[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<PlaybackMode>("full");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Filter snapshots based on mode
  const snapshots = useMemo(() => {
    if (mode === "summary") {
      return allSnapshots.filter((s) => s.isKeyframe);
    }
    return allSnapshots;
  }, [allSnapshots, mode]);

  // Reset index when mode changes
  useEffect(() => {
    setCurrentIndex(snapshots.length > 0 ? snapshots.length - 1 : 0);
    setIsPlaying(false);
  }, [mode, snapshots.length]);

  // Load snapshots
  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabaseSnapshots = await loadSessionFromSupabase(roomId);
      const memorySnapshots = getSnapshots();

      // Merge supabase + in-memory, deduplicate by timestamp
      const merged = new Map<number, CanvasSnapshot>();
      for (const s of supabaseSnapshots) merged.set(s.timestamp, s);
      for (const s of memorySnapshots) merged.set(s.timestamp, s);

      const all = Array.from(merged.values()).sort((a, b) => a.timestamp - b.timestamp);
      setAllSnapshots(all);
      setCurrentIndex(all.length > 0 ? all.length - 1 : 0);
      setLoading(false);
    }
    load();
  }, [roomId]);

  const applySnapshot = useCallback(
    (index: number) => {
      if (!editor || !snapshots[index]) return;

      const snapshot = snapshots[index];
      const storeData = (snapshot.store as Record<string, unknown>)?.store ?? snapshot.store ?? {};
      const records: TLRecord[] = Object.values(storeData) as TLRecord[];

      const docRecords = records.filter(
        (r) =>
          r.typeName !== "instance" &&
          r.typeName !== "instance_page_state" &&
          r.typeName !== "camera" &&
          r.typeName !== "pointer"
      );

      const remoteDocIds = new Set(docRecords.map((r) => r.id));

      const localRecords = editor.store.allRecords();
      const localDocIds = localRecords
        .filter(
          (r) =>
            r.typeName !== "instance" &&
            r.typeName !== "instance_page_state" &&
            r.typeName !== "camera" &&
            r.typeName !== "pointer"
        )
        .map((r) => r.id);

      const toRemove = localDocIds.filter((id) => !remoteDocIds.has(id));
      if (toRemove.length > 0) {
        editor.store.remove(toRemove);
      }

      if (docRecords.length > 0) {
        editor.store.put(docRecords);
      }
    },
    [editor, snapshots]
  );

  // Play/pause logic
  useEffect(() => {
    if (isPlaying && snapshots.length > 0) {
      const baseDelay = mode === "summary" ? 2000 : 3000;
      const delay = baseDelay / speed;

      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          const next = prev + 1;
          if (next >= snapshots.length) {
            setIsPlaying(false);
            return prev;
          }
          return next;
        });
      }, delay);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, speed, snapshots.length, mode]);

  // Apply snapshot when index changes
  useEffect(() => {
    applySnapshot(currentIndex);
  }, [currentIndex, applySnapshot]);

  const currentSnapshot = snapshots[currentIndex];
  const keyframeCount = allSnapshots.filter((s) => s.isKeyframe).length;

  if (loading) {
    return (
      <div style={panelStyle}>
        <div style={{ padding: 20, color: "#9ca3af", textAlign: "center" }}>
          Cargando historial...
        </div>
      </div>
    );
  }

  if (snapshots.length === 0) {
    return (
      <div style={panelStyle}>
        <div style={headerStyle}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#1f2937" }}>Playback</span>
          <button onClick={onClose} style={closeButtonStyle}>X</button>
        </div>
        {/* Mode toggle even when empty */}
        {mode === "summary" && allSnapshots.length > 0 ? (
          <div style={{ padding: "12px 16px", textAlign: "center" }}>
            <div style={{ color: "#9ca3af", fontSize: 13, marginBottom: 8 }}>
              No hay keyframes marcados aun.
            </div>
            <button onClick={() => setMode("full")} style={modeBtnStyle(false)}>
              Ver historial completo ({allSnapshots.length})
            </button>
          </div>
        ) : (
          <div style={{ padding: 20, color: "#9ca3af", textAlign: "center", fontSize: 13 }}>
            No hay historial disponible aun. El canvas guarda snapshots cada 3 segundos mientras trabajas.
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#1f2937" }}>
          Playback
        </span>
        <button onClick={onClose} style={closeButtonStyle}>X</button>
      </div>

      {/* Mode toggle */}
      <div style={{ display: "flex", gap: 4, padding: "8px 16px 0" }}>
        <button
          onClick={() => setMode("full")}
          style={modeBtnStyle(mode === "full")}
        >
          Completo ({allSnapshots.length})
        </button>
        <button
          onClick={() => setMode("summary")}
          style={modeBtnStyle(mode === "summary")}
        >
          Resumen ({keyframeCount})
        </button>
      </div>

      {/* Current author */}
      {currentSnapshot && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px" }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              backgroundColor: currentSnapshot.userColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 600,
              color: "white",
            }}
          >
            {currentSnapshot.userName[0]?.toUpperCase()}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 12, color: "#374151" }}>{currentSnapshot.userName}</span>
            {currentSnapshot.isKeyframe && currentSnapshot.keyframeName && (
              <span style={{ fontSize: 10, color: "#3b82f6", fontWeight: 500 }}>
                {currentSnapshot.keyframeName}
              </span>
            )}
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
            {currentSnapshot.isKeyframe && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#3b82f6">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            )}
            <span style={{ fontSize: 11, color: "#9ca3af" }}>
              {new Date(currentSnapshot.timestamp).toLocaleTimeString("es", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          </div>
        </div>
      )}

      {/* Slider */}
      <div style={{ padding: "8px 16px" }}>
        <Slider.Root
          value={[currentIndex]}
          max={Math.max(snapshots.length - 1, 1)}
          step={1}
          onValueChange={([val]) => {
            setIsPlaying(false);
            setCurrentIndex(val);
          }}
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            width: "100%",
            height: 20,
          }}
        >
          <Slider.Track
            style={{
              backgroundColor: "#e5e7eb",
              height: 4,
              borderRadius: 2,
              flexGrow: 1,
              position: "relative",
            }}
          >
            <Slider.Range
              style={{
                backgroundColor: "#3b82f6",
                height: "100%",
                borderRadius: 2,
                position: "absolute",
              }}
            />
          </Slider.Track>
          <Slider.Thumb
            style={{
              display: "block",
              width: 14,
              height: 14,
              backgroundColor: "#3b82f6",
              borderRadius: "50%",
              border: "2px solid white",
              boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
              cursor: "pointer",
            }}
          />
        </Slider.Root>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#9ca3af", marginTop: 4 }}>
          <span>{currentIndex + 1}</span>
          <span>{snapshots.length} {mode === "summary" ? "keyframes" : "snapshots"}</span>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 16px 12px" }}>
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          style={{
            backgroundColor: isPlaying ? "#ef4444" : "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: 6,
            padding: "6px 16px",
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          {isPlaying ? "Pausar" : "Play"}
        </button>

        {/* Speed selector */}
        {SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            style={{
              backgroundColor: speed === s ? "#1f2937" : "#f3f4f6",
              color: speed === s ? "white" : "#374151",
              border: "none",
              borderRadius: 4,
              padding: "4px 8px",
              fontSize: 11,
              cursor: "pointer",
              fontWeight: speed === s ? 600 : 400,
            }}
          >
            {s}x
          </button>
        ))}
      </div>

      {/* Timeline dots */}
      <div style={{ padding: "0 16px 12px", maxHeight: 200, overflowY: "auto" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
          {snapshots.map((snap, i) => (
            <button
              key={i}
              onClick={() => {
                setIsPlaying(false);
                setCurrentIndex(i);
              }}
              title={`${snap.userName}${snap.isKeyframe ? ` — ${snap.keyframeName || "Keyframe"}` : ""} — ${new Date(snap.timestamp).toLocaleTimeString()}`}
              style={{
                width: snap.isKeyframe ? 10 : 8,
                height: snap.isKeyframe ? 10 : 8,
                borderRadius: snap.isKeyframe ? 2 : "50%",
                backgroundColor: i === currentIndex ? snap.userColor : `${snap.userColor}66`,
                border: i === currentIndex ? "1.5px solid #1f2937" : "none",
                cursor: "pointer",
                padding: 0,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  width: 300,
  backgroundColor: "rgba(255,255,255,0.95)",
  backdropFilter: "blur(16px)",
  borderRadius: 12,
  boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
  border: "1px solid #e5e7eb",
  overflow: "hidden",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "10px 16px",
  borderBottom: "1px solid #f3f4f6",
};

const closeButtonStyle: React.CSSProperties = {
  border: "none",
  background: "none",
  cursor: "pointer",
  fontSize: 13,
  color: "#9ca3af",
  fontWeight: 600,
};

function modeBtnStyle(active: boolean): React.CSSProperties {
  return {
    flex: 1,
    padding: "5px 8px",
    fontSize: 11,
    fontWeight: active ? 600 : 400,
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    backgroundColor: active ? "#1f2937" : "#f3f4f6",
    color: active ? "white" : "#6b7280",
  };
}
