"use client";

import { useState, useEffect } from "react";
import { Editor } from "tldraw";
import { insertAIResult, AIResultType } from "@/lib/ai-to-shapes";
import { apiUrl } from "@/lib/api-config";

interface Props {
  editor: Editor | null;
}

const TYPES: { key: AIResultType; icon: string; label: string; placeholder: string }[] = [
  { key: "mindmap", icon: "🧠", label: "Mapa mental", placeholder: "Ej: Estrategias para lanzar un producto SaaS" },
  { key: "flowchart", icon: "📊", label: "Flowchart", placeholder: "Ej: Proceso de compra en un e-commerce" },
  { key: "architecture", icon: "🏗️", label: "Arquitectura", placeholder: "Ej: App con Next.js, Supabase y Vercel" },
  { key: "timeline", icon: "📅", label: "Timeline", placeholder: "Ej: Timeline para lanzar un SaaS en 3 meses" },
  { key: "table", icon: "📋", label: "Tabla", placeholder: "Ej: Compara React vs Vue vs Svelte" },
  { key: "wireframe", icon: "🖥️", label: "Wireframe", placeholder: "Ej: Pantalla de login mobile" },
];

interface HistoryEntry {
  type: AIResultType;
  prompt: string;
  result: unknown;
  createdAt: number;
}

export default function AIGeneratorPanel({ editor }: Props) {
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<AIResultType>("mindmap");
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ai-gen-history");
      if (saved) setHistory(JSON.parse(saved));
    } catch {}
  }, []);

  const saveHistory = (entries: HistoryEntry[]) => {
    setHistory(entries);
    try { localStorage.setItem("ai-gen-history", JSON.stringify(entries)); } catch {}
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !editor) return;
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(apiUrl("/api/ai-generate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: selectedType, prompt: prompt.trim(), language: "es" }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Error ${res.status}`);
      }

      const { result } = await res.json();
      insertAIResult(selectedType, result, editor);

      // Save to history
      const entry: HistoryEntry = { type: selectedType, prompt: prompt.trim(), result, createdAt: Date.now() };
      const newHistory = [entry, ...history].slice(0, 5);
      saveHistory(newHistory);

      setSuccess(true);
      setPrompt("");
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReinsert = (entry: HistoryEntry) => {
    if (!editor) return;
    insertAIResult(entry.type, entry.result, editor);
  };

  const selectedTypeInfo = TYPES.find((t) => t.key === selectedType)!;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 14px",
          borderRadius: 10,
          border: "none",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 600,
          background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
          color: "white",
          boxShadow: "0 2px 12px rgba(99,102,241,0.4)",
        }}
      >
        <span style={{ fontSize: 16 }}>✨</span> Crear con AI
      </button>
    );
  }

  return (
    <div
      style={{
        width: 340,
        maxHeight: "80vh",
        backgroundColor: "white",
        borderRadius: 12,
        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 16px",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
          color: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, fontSize: 15 }}>
          <span style={{ fontSize: 18 }}>✨</span> Crear con AI
        </div>
        <button
          onClick={() => setOpen(false)}
          style={{
            background: "none",
            border: "none",
            color: "white",
            cursor: "pointer",
            fontSize: 18,
            padding: 4,
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ padding: 16, overflowY: "auto", flex: 1 }}>
        {/* Type selector */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
          {TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => setSelectedType(t.key)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                padding: "10px 4px",
                borderRadius: 8,
                border: selectedType === t.key ? "2px solid #6366f1" : "2px solid #e5e7eb",
                backgroundColor: selectedType === t.key ? "#eef2ff" : "white",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: selectedType === t.key ? 600 : 400,
                color: selectedType === t.key ? "#4338ca" : "#374151",
                transition: "all 0.15s",
              }}
            >
              <span style={{ fontSize: 20 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Prompt */}
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={selectedTypeInfo.placeholder}
          rows={3}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #d1d5db",
            fontSize: 13,
            resize: "vertical",
            fontFamily: "inherit",
            outline: "none",
            boxSizing: "border-box",
          }}
          onFocus={(e) => { e.target.style.borderColor = "#6366f1"; }}
          onBlur={(e) => { e.target.style.borderColor = "#d1d5db"; }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate();
          }}
        />

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={isLoading || !prompt.trim()}
          style={{
            width: "100%",
            padding: "10px 0",
            borderRadius: 8,
            border: "none",
            cursor: isLoading || !prompt.trim() ? "not-allowed" : "pointer",
            fontSize: 14,
            fontWeight: 600,
            marginTop: 10,
            background: isLoading ? "#9ca3af" : success ? "#22c55e" : "linear-gradient(135deg, #8b5cf6, #6366f1)",
            color: "white",
            transition: "all 0.2s",
            opacity: !prompt.trim() && !isLoading ? 0.5 : 1,
          }}
        >
          {isLoading ? "Generando..." : success ? "✓ Listo!" : `Generar ${selectedTypeInfo.label}`}
        </button>

        {/* Shortcut hint */}
        <div style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", marginTop: 4 }}>
          ⌘+Enter para generar
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              marginTop: 10,
              padding: "8px 12px",
              borderRadius: 8,
              backgroundColor: "#fef2f2",
              color: "#dc2626",
              fontSize: 12,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>{error}</span>
            <button
              onClick={handleGenerate}
              style={{
                background: "none",
                border: "none",
                color: "#dc2626",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                textDecoration: "underline",
              }}
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Success */}
        {success && (
          <div
            style={{
              marginTop: 10,
              padding: "8px 12px",
              borderRadius: 8,
              backgroundColor: "#f0fdf4",
              color: "#16a34a",
              fontSize: 12,
            }}
          >
            Puedes editar el resultado en el canvas
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 8 }}>
              Ultimas generaciones
            </div>
            {history.map((entry, i) => {
              const typeInfo = TYPES.find((t) => t.key === entry.type);
              return (
                <button
                  key={i}
                  onClick={() => handleReinsert(entry)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: "1px solid #e5e7eb",
                    backgroundColor: "white",
                    cursor: "pointer",
                    fontSize: 12,
                    textAlign: "left",
                    marginBottom: 4,
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f9fafb"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "white"; }}
                >
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{typeInfo?.icon}</span>
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <div style={{ fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {entry.prompt}
                    </div>
                    <div style={{ color: "#9ca3af", fontSize: 10 }}>
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "8px 16px",
          borderTop: "1px solid #e5e7eb",
          fontSize: 10,
          color: "#9ca3af",
          textAlign: "center",
        }}
      >
        Powered by Claude
      </div>
    </div>
  );
}
