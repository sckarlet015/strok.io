"use client";

import { useState, useCallback } from "react";
import { useStorage, useMutation } from "@/lib/liveblocks.config";
import PresenceAvatars from "./PresenceAvatars";
import Toast from "./Toast";
import { useIsMobile } from "@/lib/useIsMobile";

interface RoomHeaderProps {
  onTogglePlayback: () => void;
  showPlayback: boolean;
}

export default function RoomHeader({ onTogglePlayback, showPlayback }: RoomHeaderProps) {
  const boardName = useStorage((root) => root.meta?.boardName) ?? "Sin titulo";
  const [toast, setToast] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const isMobile = useIsMobile();

  const updateBoardName = useMutation(({ storage }, newName: string) => {
    storage.get("meta").set("boardName", newName);
  }, []);

  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    setToast("Link copiado al portapapeles");
  }, []);

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: isMobile ? 8 : 12,
          backgroundColor: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(12px)",
          borderRadius: 10,
          padding: isMobile ? "5px 10px" : "6px 14px",
          boxShadow: "0 1px 8px rgba(0,0,0,0.08)",
          border: "1px solid #e5e7eb",
          cursor: isMobile ? "default" : "grab",
          maxWidth: isMobile ? "90vw" : "none",
        }}
      >
        {/* Board name */}
        {isEditing ? (
          <input
            autoFocus
            defaultValue={boardName}
            onBlur={(e) => {
              const val = e.target.value.trim() || "Sin titulo";
              updateBoardName(val);
              setIsEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const val = (e.target as HTMLInputElement).value.trim() || "Sin titulo";
                updateBoardName(val);
                setIsEditing(false);
              }
            }}
            style={{
              border: "none",
              outline: "none",
              fontSize: 13,
              fontWeight: 600,
              backgroundColor: "transparent",
              width: 140,
              color: "#1f2937",
            }}
          />
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            style={{
              border: "none",
              background: "none",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              color: "#1f2937",
              maxWidth: 160,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title="Click para editar nombre"
          >
            {boardName}
          </button>
        )}

        {/* Separator */}
        <div style={{ width: 1, height: 20, backgroundColor: "#e5e7eb" }} />

        {/* Presence avatars */}
        <PresenceAvatars />

        {/* Separator */}
        <div style={{ width: 1, height: 20, backgroundColor: "#e5e7eb" }} />

        {/* Playback button (desktop only - mobile has it in bottom bar) */}
        {!isMobile && (
          <button
            onClick={onTogglePlayback}
            title="Playback del canvas"
            style={{
              border: "none",
              backgroundColor: showPlayback ? "#1f2937" : "#f3f4f6",
              color: showPlayback ? "white" : "#374151",
              fontSize: 14,
              padding: "4px 8px",
              borderRadius: 6,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
            </svg>
          </button>
        )}

        {/* Share button */}
        <button
          onClick={handleShare}
          style={{
            border: "none",
            backgroundColor: "#3b82f6",
            color: "white",
            fontSize: isMobile ? 11 : 12,
            fontWeight: 500,
            padding: isMobile ? "4px 8px" : "5px 12px",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          {isMobile ? "Link" : "Compartir"}
        </button>
      </div>

      {toast && (
        <Toast
          message={toast}
          variant="success"
          onDismiss={() => setToast(null)}
        />
      )}
    </>
  );
}
