"use client";

interface FocusModeButtonProps {
  isFocusMode: boolean;
  onToggle: () => void;
  onPublish: () => void;
}

export default function FocusModeButton({
  isFocusMode,
  onToggle,
  onPublish,
}: FocusModeButtonProps) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <button
        onClick={onToggle}
        title={isFocusMode ? "Salir de Modo Foco" : "Entrar a Modo Foco"}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 12px",
          borderRadius: 8,
          border: "none",
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 500,
          backgroundColor: isFocusMode ? "#f97316" : "#f3f4f6",
          color: isFocusMode ? "white" : "#374151",
          transition: "all 0.2s",
        }}
      >
        {isFocusMode ? (
          // Eye off icon
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          // Eye icon
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
        {isFocusMode ? "Foco" : "Foco"}
        {isFocusMode && (
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "white",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
        )}
      </button>

      {isFocusMode && (
        <button
          onClick={onPublish}
          title="Publicar al canvas compartido"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 600,
            backgroundColor: "#3b82f6",
            color: "white",
            transition: "all 0.2s",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          Publicar
        </button>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
