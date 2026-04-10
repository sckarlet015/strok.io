"use client";

import { useRef, useState, useCallback, ReactNode, useEffect } from "react";

interface DraggableProps {
  id: string;
  children: ReactNode;
  defaultPosition: { x: number; y: number };
  style?: React.CSSProperties;
}

function loadPosition(id: string): { x: number; y: number } | null {
  try {
    const saved = localStorage.getItem(`draggable-${id}`);
    if (saved) return JSON.parse(saved);
  } catch {}
  return null;
}

function savePosition(id: string, pos: { x: number; y: number }) {
  try {
    localStorage.setItem(`draggable-${id}`, JSON.stringify(pos));
  } catch {}
}

export default function Draggable({
  id,
  children,
  defaultPosition,
  style,
}: DraggableProps) {
  const [pos, setPos] = useState(() => loadPosition(id) ?? defaultPosition);
  const [minimized, setMinimized] = useState(false);
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const handleRef = useRef<HTMLDivElement>(null);

  // Save position when it changes
  useEffect(() => {
    savePosition(id, pos);
  }, [id, pos]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    offset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
    e.stopPropagation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos.x, pos.y]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    e.preventDefault();
    e.stopPropagation();
    setPos({
      x: e.clientX - offset.current.x,
      y: e.clientY - offset.current.y,
    });
  }, []);

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        zIndex: 301,
        ...style,
      }}
    >
      {/* Drag handle bar */}
      <div
        ref={handleRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 2,
          paddingBottom: 2,
          cursor: "grab",
          userSelect: "none",
        }}
      >
        {/* Drag icon */}
        <svg
          width="14" height="14" viewBox="0 0 24 24"
          fill="none" stroke="#9ca3af" strokeWidth="2"
          style={{ cursor: "grab", marginRight: "auto" }}
        >
          <circle cx="9" cy="6" r="1.5" fill="#9ca3af" />
          <circle cx="15" cy="6" r="1.5" fill="#9ca3af" />
          <circle cx="9" cy="12" r="1.5" fill="#9ca3af" />
          <circle cx="15" cy="12" r="1.5" fill="#9ca3af" />
          <circle cx="9" cy="18" r="1.5" fill="#9ca3af" />
          <circle cx="15" cy="18" r="1.5" fill="#9ca3af" />
        </svg>

        {/* Minimize/maximize button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMinimized(!minimized);
          }}
          style={{
            border: "none",
            background: "none",
            cursor: "pointer",
            padding: 2,
            display: "flex",
            alignItems: "center",
            color: "#9ca3af",
          }}
          title={minimized ? "Maximizar" : "Minimizar"}
        >
          {minimized ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          )}
        </button>
      </div>

      {/* Content */}
      {!minimized && children}
    </div>
  );
}
