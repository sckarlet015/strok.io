"use client";

import { useState } from "react";
import { VotingSession, useMutation, useSelf } from "@/lib/liveblocks.config";
import { Editor } from "tldraw";

interface VotingButtonProps {
  editor: Editor | null;
}

type VoteType = "approval" | "stars" | "dot";

export default function VotingButton({ editor }: VotingButtonProps) {
  const [showModal, setShowModal] = useState(false);
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
    setShowModal(false);
    setQuestion("");
    setOptions(["Opcion 1", "Opcion 2"]);
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        title="Iniciar votacion"
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
          backgroundColor: "#f3f4f6",
          color: "#374151",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="12" width="4" height="9" />
          <rect x="10" y="8" width="4" height="13" />
          <rect x="17" y="3" width="4" height="18" />
        </svg>
        Votar
      </button>

      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 500,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.3)",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div style={modalStyle}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#1f2937", marginBottom: 16 }}>
              Nueva votacion
            </div>

            {/* Question */}
            <label style={labelStyle}>Pregunta</label>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ej: Aprobamos este diseno?"
              style={inputStyle}
              autoFocus
            />

            {/* Vote type */}
            <label style={{ ...labelStyle, marginTop: 12 }}>Tipo de votacion</label>
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {([
                { value: "approval", label: "Aprobacion", icon: "👍👎" },
                { value: "stars", label: "Estrellas", icon: "⭐" },
                { value: "dot", label: "Opciones", icon: "🔘" },
              ] as const).map((t) => (
                <button
                  key={t.value}
                  onClick={() => setVoteType(t.value)}
                  style={{
                    flex: 1,
                    padding: "8px 4px",
                    borderRadius: 8,
                    border: voteType === t.value ? "2px solid #3b82f6" : "1px solid #e5e7eb",
                    backgroundColor: voteType === t.value ? "#eff6ff" : "white",
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

            {/* Options for dot voting */}
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

            {/* Selected shapes info */}
            {editor && editor.getSelectedShapeIds().length > 0 && (
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 12 }}>
                {editor.getSelectedShapeIds().length} elemento(s) seleccionado(s) se vincularan a esta votacion
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  backgroundColor: "white",
                  cursor: "pointer",
                  fontSize: 12,
                  color: "#374151",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={startVoting}
                disabled={!question.trim()}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "none",
                  backgroundColor: question.trim() ? "#3b82f6" : "#d1d5db",
                  color: "white",
                  cursor: question.trim() ? "pointer" : "default",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Iniciar votacion
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const modalStyle: React.CSSProperties = {
  width: 380,
  backgroundColor: "white",
  borderRadius: 12,
  padding: 20,
  boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
};

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
