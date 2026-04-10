"use client";

import { useState } from "react";
import { Editor } from "tldraw";
import { VotingSession, useMutation, useSelf } from "@/lib/liveblocks.config";
import { useIsMobile } from "@/lib/useIsMobile";
import { apiUrl } from "@/lib/api-config";
import { createRetroTemplate } from "@/lib/templates/retro";
import { createBrainstormTemplate } from "@/lib/templates/brainstorm";
import { createKanbanTemplate } from "@/lib/templates/kanban";
import { createEmpathyTemplate } from "@/lib/templates/empathy";
import { createVotingBoardTemplate } from "@/lib/templates/voting-board";
import { insertAIResult, AIResultType } from "@/lib/ai-to-shapes";
import { markKeyframe } from "@/lib/snapshot-manager";

// ── Types ──

type PanelId = "focus" | "vote" | "templates" | "ai" | "playback" | null;
type VoteType = "approval" | "stars" | "dot";

interface SidePanelProps {
  editor: Editor | null;
  isFocusMode: boolean;
  onToggleFocus: () => void;
  onPublishFocus: () => void;
  showPlayback: boolean;
  onTogglePlayback: () => void;
}

// ── Sidebar items config ──

const ITEMS: { id: PanelId; label: string; icon: React.ReactNode; hasPanel: boolean }[] = [
  {
    id: "focus",
    label: "Modo Foco",
    hasPanel: false,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    id: "vote",
    label: "Votar",
    hasPanel: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="12" width="4" height="9" />
        <rect x="10" y="8" width="4" height="13" />
        <rect x="17" y="3" width="4" height="18" />
      </svg>
    ),
  },
  {
    id: "templates",
    label: "Templates",
    hasPanel: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    id: "ai",
    label: "Crear con AI",
    hasPanel: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    id: "playback",
    label: "Playback",
    hasPanel: false,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
      </svg>
    ),
  },
];

// ── Templates ──

const TEMPLATES = [
  { id: "retro", name: "Retrospectiva", icon: "🔄", tag: "Agile", create: createRetroTemplate },
  { id: "brainstorm", name: "Brainstorm", icon: "💡", tag: "Ideacion", create: createBrainstormTemplate },
  { id: "kanban", name: "Kanban", icon: "📋", tag: "Gestion", create: createKanbanTemplate },
  { id: "empathy", name: "Mapa de Empatia", icon: "🧠", tag: "UX Research", create: createEmpathyTemplate },
  { id: "voting", name: "Voting Board", icon: "🗳", tag: "Priorizacion", create: createVotingBoardTemplate },
];

// ── AI types ──

const AI_TYPES: { key: AIResultType; icon: string; label: string; placeholder: string }[] = [
  { key: "mindmap", icon: "🧠", label: "Mapa mental", placeholder: "Ej: Estrategias para lanzar un producto SaaS" },
  { key: "flowchart", icon: "📊", label: "Flowchart", placeholder: "Ej: Proceso de compra en un e-commerce" },
  { key: "architecture", icon: "🏗️", label: "Arquitectura", placeholder: "Ej: App con Next.js, Supabase y Vercel" },
  { key: "timeline", icon: "📅", label: "Timeline", placeholder: "Ej: Timeline para lanzar un SaaS en 3 meses" },
  { key: "table", icon: "📋", label: "Tabla", placeholder: "Ej: Compara React vs Vue vs Svelte" },
  { key: "wireframe", icon: "🖥️", label: "Wireframe", placeholder: "Ej: Pantalla de login mobile" },
];

// ── Main Component ──

export default function SidePanel({
  editor,
  isFocusMode,
  onToggleFocus,
  onPublishFocus,
  showPlayback,
  onTogglePlayback,
}: SidePanelProps) {
  const [activePanel, setActivePanel] = useState<PanelId>(null);
  const isMobile = useIsMobile();

  const handleItemClick = (id: PanelId) => {
    if (id === "focus") {
      onToggleFocus();
      return;
    }
    if (id === "playback") {
      onTogglePlayback();
      return;
    }
    setActivePanel(activePanel === id ? null : id);
  };

  // ── Mobile: bottom bar + bottom sheet ──
  if (isMobile) {
    return (
      <>
        {/* Bottom bar */}
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 300,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-around",
            backgroundColor: "rgba(255,255,255,0.97)",
            backdropFilter: "blur(12px)",
            borderTop: "1px solid #e5e7eb",
            padding: "6px 0",
            paddingBottom: "max(6px, var(--sab))",
          }}
        >
          {ITEMS.map((item) => {
            const isActive =
              (item.id === "focus" && isFocusMode) ||
              (item.id === "playback" && showPlayback) ||
              activePanel === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                style={{
                  width: 44,
                  height: 44,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                  borderRadius: 10,
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: isActive ? "#4f46e5" : "transparent",
                  color: isActive ? "white" : "#6b7280",
                  position: "relative",
                }}
              >
                {item.icon}
                <span style={{ fontSize: 9, fontWeight: 500 }}>{item.label}</span>
                {item.id === "focus" && isFocusMode && (
                  <span
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      backgroundColor: "#f97316",
                      animation: "pulse 1.5s ease-in-out infinite",
                    }}
                  />
                )}
              </button>
            );
          })}

          {/* Keyframe */}
          <button
            onClick={() => markKeyframe()}
            style={{
              width: 44,
              height: 44,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              borderRadius: 10,
              border: "none",
              cursor: "pointer",
              backgroundColor: "transparent",
              color: "#6b7280",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span style={{ fontSize: 9, fontWeight: 500 }}>Keyframe</span>
          </button>
        </div>

        {/* Bottom sheet for panels */}
        {activePanel && (
          <>
            <div
              onClick={() => setActivePanel(null)}
              style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.25)", zIndex: 310 }}
            />
            <div
              style={{
                position: "fixed",
                bottom: 0,
                left: 0,
                right: 0,
                maxHeight: "70vh",
                overflowY: "auto",
                backgroundColor: "white",
                borderRadius: "16px 16px 0 0",
                boxShadow: "0 -4px 24px rgba(0,0,0,0.15)",
                zIndex: 311,
                paddingBottom: "max(16px, var(--sab))",
                animation: "sheetUp 0.25s ease-out",
              }}
            >
              {/* Drag handle */}
              <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#d1d5db" }} />
              </div>

              {activePanel === "vote" && (
                <VotePanel editor={editor} onClose={() => setActivePanel(null)} />
              )}
              {activePanel === "templates" && (
                <TemplatesPanel editor={editor} onClose={() => setActivePanel(null)} />
              )}
              {activePanel === "ai" && (
                <AIPanel editor={editor} />
              )}
            </div>
          </>
        )}

        {/* Focus mode publish button (mobile) */}
        {isFocusMode && (
          <div
            style={{
              position: "fixed",
              bottom: 70,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 410,
            }}
          >
            <button
              onClick={onPublishFocus}
              style={{
                padding: "10px 24px",
                borderRadius: 20,
                border: "none",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
                backgroundColor: "#3b82f6",
                color: "white",
                boxShadow: "0 4px 20px rgba(59,130,246,0.4)",
                whiteSpace: "nowrap",
              }}
            >
              Publicar al canvas
            </button>
          </div>
        )}

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
          @keyframes sheetUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
        `}</style>
      </>
    );
  }

  // ── Desktop: sidebar ──
  return (
    <div style={{ position: "absolute", left: 12, top: 48, zIndex: 300, display: "flex", gap: 0 }}>
      {/* Icon bar */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          backgroundColor: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(12px)",
          borderRadius: 12,
          padding: 6,
          boxShadow: "0 2px 16px rgba(0,0,0,0.10)",
          border: "1px solid #e5e7eb",
        }}
      >
        {ITEMS.map((item) => {
          const isActive =
            (item.id === "focus" && isFocusMode) ||
            (item.id === "playback" && showPlayback) ||
            activePanel === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              title={item.label}
              style={{
                width: 40,
                height: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                backgroundColor: isActive ? "#4f46e5" : "transparent",
                color: isActive ? "white" : "#6b7280",
                transition: "all 0.15s",
                position: "relative",
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = "#f3f4f6";
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              {item.icon}
              {/* Active dot for focus mode */}
              {item.id === "focus" && isFocusMode && (
                <span
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    backgroundColor: "#f97316",
                    animation: "pulse 1.5s ease-in-out infinite",
                  }}
                />
              )}
            </button>
          );
        })}

        {/* Divider */}
        <div style={{ height: 1, backgroundColor: "#e5e7eb", margin: "2px 6px" }} />

        {/* Keyframe button */}
        <button
          onClick={() => markKeyframe()}
          title="Guardar keyframe"
          style={{
            width: 40,
            height: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            backgroundColor: "transparent",
            color: "#6b7280",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f3f4f6"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      </div>

      {/* Expanded panel */}
      {activePanel && (
        <div
          style={{
            marginLeft: 8,
            width: 320,
            maxHeight: "calc(100vh - 140px)",
            overflowY: "auto",
            backgroundColor: "rgba(255,255,255,0.97)",
            backdropFilter: "blur(12px)",
            borderRadius: 12,
            boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
            border: "1px solid #e5e7eb",
            animation: "slideIn 0.15s ease-out",
          }}
        >
          {activePanel === "vote" && (
            <VotePanel editor={editor} onClose={() => setActivePanel(null)} />
          )}
          {activePanel === "templates" && (
            <TemplatesPanel editor={editor} onClose={() => setActivePanel(null)} />
          )}
          {activePanel === "ai" && (
            <AIPanel editor={editor} />
          )}
        </div>
      )}

      {/* Focus mode publish hint */}
      {isFocusMode && (
        <div
          style={{
            position: "absolute",
            left: 56,
            top: 0,
            display: "flex",
            gap: 6,
            alignItems: "center",
          }}
        >
          <button
            onClick={onPublishFocus}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              backgroundColor: "#3b82f6",
              color: "white",
              boxShadow: "0 2px 12px rgba(59,130,246,0.3)",
              whiteSpace: "nowrap",
            }}
          >
            Publicar al canvas
          </button>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

// ── Vote Sub-Panel ──

function VotePanel({ editor, onClose }: { editor: Editor | null; onClose: () => void }) {
  const [question, setQuestion] = useState("");
  const [voteType, setVoteType] = useState<VoteType>("approval");
  const [options, setOptions] = useState(["Opcion 1", "Opcion 2"]);
  const self = useSelf();

  const updateVoting = useMutation(({ storage }, newSession: string) => {
    storage.get("voting").set("session", newSession);
  }, []);

  const startVoting = () => {
    if (!question.trim()) return;
    const selfId = self?.id?.toString() ?? "";
    const session: VotingSession = {
      id: crypto.randomUUID(),
      type: voteType,
      question: question.trim(),
      options: voteType === "dot" ? options.filter((o) => o.trim()) : [],
      votes: {},
      createdBy: selfId,
      createdByName: self?.presence.name ?? "Anonimo",
      createdAt: Date.now(),
      closedAt: null,
      linkedShapeIds: editor ? editor.getSelectedShapeIds().map(String) : [],
    };
    updateVoting(JSON.stringify(session));
    onClose();
  };

  return (
    <div style={{ padding: 16 }}>
      <PanelHeader title="Nueva votacion" icon="📊" />

      <label style={labelStyle}>Pregunta</label>
      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ej: Aprobamos este diseno?"
        style={inputStyle}
        autoFocus
      />

      <label style={{ ...labelStyle, marginTop: 8 }}>Tipo</label>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {([
          { value: "approval" as const, label: "Aprobacion", icon: "👍👎" },
          { value: "stars" as const, label: "Estrellas", icon: "⭐" },
          { value: "dot" as const, label: "Opciones", icon: "🔘" },
        ]).map((t) => (
          <button
            key={t.value}
            onClick={() => setVoteType(t.value)}
            style={{
              flex: 1,
              padding: "8px 4px",
              borderRadius: 8,
              border: voteType === t.value ? "2px solid #4f46e5" : "1px solid #e5e7eb",
              backgroundColor: voteType === t.value ? "#eef2ff" : "white",
              cursor: "pointer",
              fontSize: 11,
              color: "#1f2937",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span style={{ fontSize: 16 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {voteType === "dot" && (
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Opciones</label>
          {options.map((opt, i) => (
            <div key={i} style={{ display: "flex", gap: 4, marginBottom: 4 }}>
              <input
                value={opt}
                onChange={(e) => {
                  const newOpts = [...options];
                  newOpts[i] = e.target.value;
                  setOptions(newOpts);
                }}
                style={{ ...inputStyle, marginBottom: 0 }}
              />
              {options.length > 2 && (
                <button
                  onClick={() => setOptions(options.filter((_, j) => j !== i))}
                  style={{ border: "none", background: "none", color: "#9ca3af", cursor: "pointer", fontSize: 16 }}
                >
                  x
                </button>
              )}
            </div>
          ))}
          {options.length < 6 && (
            <button
              onClick={() => setOptions([...options, `Opcion ${options.length + 1}`])}
              style={{
                border: "1px dashed #d1d5db",
                background: "none",
                borderRadius: 6,
                padding: "4px 8px",
                fontSize: 11,
                color: "#6b7280",
                cursor: "pointer",
                width: "100%",
                marginTop: 4,
              }}
            >
              + Agregar opcion
            </button>
          )}
        </div>
      )}

      <button
        onClick={startVoting}
        disabled={!question.trim()}
        style={{
          width: "100%",
          padding: "10px 0",
          borderRadius: 8,
          border: "none",
          backgroundColor: question.trim() ? "#4f46e5" : "#d1d5db",
          color: "white",
          cursor: question.trim() ? "pointer" : "default",
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        Iniciar votacion
      </button>
    </div>
  );
}

// ── Templates Sub-Panel ──

function TemplatesPanel({ editor, onClose }: { editor: Editor | null; onClose: () => void }) {
  const handleSelect = (create: (editor: Editor) => void) => {
    if (!editor) return;
    create(editor);
    onClose();
  };

  return (
    <div style={{ padding: 16 }}>
      <PanelHeader title="Templates" icon="📐" />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => handleSelect(t.create)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              backgroundColor: "white",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#4f46e5";
              e.currentTarget.style.backgroundColor = "#faf5ff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#e5e7eb";
              e.currentTarget.style.backgroundColor = "white";
            }}
          >
            <span style={{ fontSize: 24, flexShrink: 0 }}>{t.icon}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1f2937" }}>{t.name}</div>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>{t.tag}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── AI Sub-Panel ──

interface HistoryEntry {
  type: AIResultType;
  prompt: string;
  result: unknown;
  createdAt: number;
}

function AIPanel({ editor }: { editor: Editor | null }) {
  const [selectedType, setSelectedType] = useState<AIResultType>("mindmap");
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      const saved = localStorage.getItem("ai-gen-history");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

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

      const entry: HistoryEntry = { type: selectedType, prompt: prompt.trim(), result, createdAt: Date.now() };
      saveHistory([entry, ...history].slice(0, 5));

      setSuccess(true);
      setPrompt("");
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedInfo = AI_TYPES.find((t) => t.key === selectedType)!;

  return (
    <div style={{ padding: 16 }}>
      <PanelHeader title="Crear con AI" icon="✨" />

      {/* Type selector */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 12 }}>
        {AI_TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => setSelectedType(t.key)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              padding: "8px 4px",
              borderRadius: 8,
              border: selectedType === t.key ? "2px solid #4f46e5" : "1px solid #e5e7eb",
              backgroundColor: selectedType === t.key ? "#eef2ff" : "white",
              cursor: "pointer",
              fontSize: 10,
              fontWeight: selectedType === t.key ? 600 : 400,
              color: selectedType === t.key ? "#4338ca" : "#6b7280",
              transition: "all 0.15s",
            }}
          >
            <span style={{ fontSize: 18 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Prompt */}
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={selectedInfo.placeholder}
        rows={3}
        style={{
          ...inputStyle,
          resize: "vertical",
          fontFamily: "inherit",
          marginBottom: 0,
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate();
        }}
      />
      <div style={{ fontSize: 10, color: "#9ca3af", marginBottom: 8, marginTop: 2 }}>
        Cmd+Enter para generar
      </div>

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
          fontSize: 13,
          fontWeight: 600,
          background: isLoading ? "#9ca3af" : success ? "#22c55e" : "#4f46e5",
          color: "white",
          opacity: !prompt.trim() && !isLoading ? 0.5 : 1,
          transition: "all 0.2s",
        }}
      >
        {isLoading ? "Generando..." : success ? "Listo!" : `Generar ${selectedInfo.label}`}
      </button>

      {/* Error */}
      {error && (
        <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: 8, backgroundColor: "#fef2f2", color: "#dc2626", fontSize: 12, display: "flex", justifyContent: "space-between" }}>
          <span>{error}</span>
          <button onClick={handleGenerate} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 12, fontWeight: 600, textDecoration: "underline" }}>
            Reintentar
          </button>
        </div>
      )}

      {/* Success */}
      {success && (
        <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: 8, backgroundColor: "#f0fdf4", color: "#16a34a", fontSize: 12 }}>
          Edita el resultado en el canvas
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", marginBottom: 6 }}>Recientes</div>
          {history.map((entry, i) => {
            const typeInfo = AI_TYPES.find((t) => t.key === entry.type);
            return (
              <button
                key={i}
                onClick={() => { if (editor) insertAIResult(entry.type, entry.result, editor); }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 8px",
                  borderRadius: 6,
                  border: "1px solid #f3f4f6",
                  backgroundColor: "white",
                  cursor: "pointer",
                  fontSize: 11,
                  textAlign: "left",
                  marginBottom: 3,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f9fafb"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "white"; }}
              >
                <span style={{ fontSize: 14 }}>{typeInfo?.icon}</span>
                <div style={{ flex: 1, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", color: "#374151" }}>
                  {entry.prompt}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Shared UI ──

function PanelHeader({ title, icon }: { title: string; icon: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: "#1f2937" }}>{title}</span>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "#6b7280",
  marginBottom: 4,
  display: "block",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  fontSize: 13,
  color: "#1f2937",
  outline: "none",
  marginBottom: 8,
  boxSizing: "border-box",
};
