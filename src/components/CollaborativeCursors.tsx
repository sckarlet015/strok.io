"use client";

import { useOthers } from "@/lib/liveblocks.config";

export default function CollaborativeCursors() {
  const others = useOthers();

  return (
    <>
      {others.map(({ connectionId, presence }) => {
        if (!presence.cursor) return null;

        return (
          <div
            key={connectionId}
            style={{
              position: "fixed",
              left: presence.cursor.x,
              top: presence.cursor.y,
              pointerEvents: "none",
              zIndex: 9999,
              transition: "all 0.1s linear",
            }}
          >
            {/* Cursor SVG */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M5 3L19 12L12 13L9 20L5 3Z"
                fill={presence.color}
                stroke="white"
                strokeWidth="1"
              />
            </svg>
            {/* Name label */}
            <span
              style={{
                position: "absolute",
                left: 16,
                top: 16,
                backgroundColor: presence.color,
                color: "white",
                padding: "2px 8px",
                borderRadius: "4px",
                fontSize: "12px",
                fontWeight: 500,
                whiteSpace: "nowrap",
              }}
            >
              {presence.name}
            </span>
          </div>
        );
      })}
    </>
  );
}
