"use client";

import { useState, useRef } from "react";

const BG_COLORS = [
  { label: "Blanco", value: "#ffffff" },
  { label: "Negro", value: "#1a1a2e" },
  { label: "Gris", value: "#f0f0f0" },
  { label: "Azul", value: "#e8f4fd" },
  { label: "Amarillo", value: "#fefce8" },
];

export default function Toolbar() {
  const [active, setActive] = useState("#ffffff");
  const [isOpen, setIsOpen] = useState(false);
  const colorInputRef = useRef<HTMLInputElement>(null);

  const applyColor = (color: string) => {
    setActive(color);
    const el = document.querySelector(".tl-background") as HTMLElement;
    if (el) {
      el.style.backgroundColor = color;
    }
  };

  return (
    <div
      style={{
        animation: "toolbar-in 0.2s ease-out",
        cursor: "grab",
      }}
    >
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          border: "1px solid #e5e7eb",
          backgroundColor: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 1px 6px rgba(0,0,0,0.08)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
        title="Color de fondo"
      >
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: 4,
            backgroundColor: active,
            border: "1.5px solid #9ca3af",
          }}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: 42,
            left: 0,
            backgroundColor: "rgba(255,255,255,0.95)",
            backdropFilter: "blur(12px)",
            borderRadius: 10,
            boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
            border: "1px solid #e5e7eb",
            padding: 10,
            width: 180,
            animation: "toolbar-in 0.15s ease-out",
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: "#6b7280",
              fontWeight: 500,
              marginBottom: 6,
              display: "block",
            }}
          >
            Fondo del lienzo
          </span>

          {/* Preset colors */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {BG_COLORS.map((c) => (
              <button
                key={c.value}
                title={c.label}
                onClick={() => {
                  applyColor(c.value);
                  setIsOpen(false);
                }}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  backgroundColor: c.value,
                  border:
                    active === c.value
                      ? "2px solid #3b82f6"
                      : "1.5px solid #d1d5db",
                  cursor: "pointer",
                  transition: "border-color 0.15s",
                }}
              />
            ))}
          </div>

          {/* Separator */}
          <div style={{ height: 1, backgroundColor: "#e5e7eb", margin: "4px 0 8px" }} />

          {/* Custom color picker */}
          <button
            onClick={() => colorInputRef.current?.click()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "6px 4px",
              borderRadius: 6,
              border: "none",
              backgroundColor: "transparent",
              cursor: "pointer",
              fontSize: 12,
              color: "#374151",
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: 4,
                background:
                  "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)",
                border: "1.5px solid #d1d5db",
              }}
            />
            Color personalizado
          </button>
          <input
            ref={colorInputRef}
            type="color"
            value={active}
            onChange={(e) => applyColor(e.target.value)}
            style={{
              position: "absolute",
              opacity: 0,
              pointerEvents: "none",
            }}
          />
        </div>
      )}
    </div>
  );
}
