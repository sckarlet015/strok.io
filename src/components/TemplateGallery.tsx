"use client";

import { useState } from "react";
import { Editor } from "tldraw";
import { createRetroTemplate } from "@/lib/templates/retro";
import { createBrainstormTemplate } from "@/lib/templates/brainstorm";
import { createKanbanTemplate } from "@/lib/templates/kanban";
import { createEmpathyTemplate } from "@/lib/templates/empathy";
import { createVotingBoardTemplate } from "@/lib/templates/voting-board";

interface TemplateGalleryProps {
  editor: Editor | null;
}

interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  tag: string;
  create: (editor: Editor) => void;
}

const templates: Template[] = [
  {
    id: "retro",
    name: "Retrospectiva",
    description: "4 zonas inteligentes que colorean stickers automaticamente",
    icon: "🔄",
    tag: "Agile",
    create: createRetroTemplate,
  },
  {
    id: "brainstorm",
    name: "Brainstorm",
    description: "Ideas que se conectan automaticamente al acercarlas",
    icon: "💡",
    tag: "Ideacion",
    create: createBrainstormTemplate,
  },
  {
    id: "kanban",
    name: "Kanban",
    description: "Columnas que reordenan tarjetas automaticamente",
    icon: "📋",
    tag: "Gestion",
    create: createKanbanTemplate,
  },
  {
    id: "empathy",
    name: "Mapa de Empatia",
    description: "Zonas para Piensa, Ve, Escucha, Dice con agrupacion inteligente",
    icon: "🧠",
    tag: "UX Research",
    create: createEmpathyTemplate,
  },
  {
    id: "voting",
    name: "Voting Board",
    description: "Grilla de ideas lista para priorizar con votacion",
    icon: "🗳",
    tag: "Priorizacion",
    create: createVotingBoardTemplate,
  },
];

export default function TemplateGallery({ editor }: TemplateGalleryProps) {
  const [showModal, setShowModal] = useState(false);

  const handleSelect = (template: Template) => {
    if (!editor) return;
    template.create(editor);
    setShowModal(false);
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        title="Templates"
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
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
        </svg>
        Templates
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
            backgroundColor: "rgba(0,0,0,0.4)",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div style={modalStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, color: "#1f2937" }}>Templates</h2>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#9ca3af" }}>
                  Selecciona un template para agregarlo al canvas
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{ border: "none", background: "none", fontSize: 18, color: "#9ca3af", cursor: "pointer" }}
              >
                X
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleSelect(t)}
                  style={cardStyle}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "#3b82f6";
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#f8fafc";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "#e5e7eb";
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = "white";
                  }}
                >
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{t.icon}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1f2937", marginBottom: 4 }}>
                    {t.name}
                  </div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8, lineHeight: 1.4 }}>
                    {t.description}
                  </div>
                  <span style={{
                    fontSize: 10,
                    padding: "2px 8px",
                    borderRadius: 10,
                    backgroundColor: "#f3f4f6",
                    color: "#6b7280",
                    fontWeight: 500,
                  }}>
                    {t.tag}
                  </span>
                </button>
              ))}

              {/* Placeholder for future */}
              <div
                style={{
                  ...cardStyle,
                  opacity: 0.5,
                  cursor: "default",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>➕</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#9ca3af" }}>Mis templates</div>
                <div style={{ fontSize: 11, color: "#d1d5db" }}>Proximamente</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const modalStyle: React.CSSProperties = {
  width: 520,
  maxHeight: "80vh",
  overflowY: "auto",
  backgroundColor: "white",
  borderRadius: 16,
  padding: 24,
  boxShadow: "0 8px 40px rgba(0,0,0,0.2)",
};

const cardStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
  padding: 16,
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  backgroundColor: "white",
  cursor: "pointer",
  transition: "all 0.15s",
};
