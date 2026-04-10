"use client";

import { useState } from "react";
import { VotingSession, useStorage, useMutation, useSelf, useOthers } from "@/lib/liveblocks.config";
import { Editor } from "tldraw";
import { resultsToShapes } from "@/lib/voting-to-canvas";

interface VotingPanelProps {
  editor: Editor | null;
}

export default function VotingPanel({ editor }: VotingPanelProps) {
  const sessionStr = useStorage((root) => root.voting?.session);
  const self = useSelf();
  const others = useOthers();
  const [myVote, setMyVote] = useState<string | number | null>(null);

  const updateVoting = useMutation(({ storage }, newSession: string) => {
    storage.get("voting").set("session", newSession);
  }, []);

  if (!sessionStr) return null;

  let session: VotingSession | null = null;
  try {
    session = sessionStr ? JSON.parse(sessionStr) : null;
  } catch {
    return null;
  }

  if (!session || !session.id) return null;

  const selfId = self?.id?.toString() ?? "";
  const isCreator = session.createdBy === selfId;
  const isClosed = session.closedAt !== null;
  const hasVoted = selfId in session.votes;
  const totalVoters = Object.keys(session.votes).length;

  // Count who has voted (show avatars)
  const allUsers = [
    ...(self ? [{ id: selfId, name: self.presence.name, color: self.presence.color }] : []),
    ...others.map((o) => ({ id: o.id?.toString() ?? "", name: o.presence.name, color: o.presence.color })),
  ];
  const voterIds = new Set(Object.keys(session.votes));

  const castVote = (value: string | number) => {
    if (isClosed || hasVoted) return;
    setMyVote(value);
    const updated: VotingSession = {
      ...session!,
      votes: { ...session!.votes, [selfId]: value },
    };
    updateVoting(JSON.stringify(updated));
  };

  const closeVoting = () => {
    const closed: VotingSession = {
      ...session!,
      closedAt: Date.now(),
    };
    updateVoting(JSON.stringify(closed));

    // Render results on canvas
    if (editor) {
      resultsToShapes(closed, editor);
    }

    // Clear session after a delay so everyone sees results
    setTimeout(() => {
      updateVoting("");
    }, 5000);
  };

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#1f2937" }}>
          {isClosed ? "Resultados" : "Votacion activa"}
        </span>
        <span style={{ fontSize: 11, color: "#9ca3af" }}>
          por {session.createdByName}
        </span>
      </div>

      {/* Question */}
      <div style={{ padding: "8px 16px", fontSize: 14, fontWeight: 500, color: "#1f2937" }}>
        {session.question}
      </div>

      {/* Voting UI based on type */}
      <div style={{ padding: "8px 16px" }}>
        {session.type === "approval" && (
          <div style={{ display: "flex", gap: 8 }}>
            <VoteButton
              label="A favor"
              icon="👍"
              active={myVote === "up" || (hasVoted && session.votes[selfId] === "up")}
              disabled={isClosed || hasVoted}
              onClick={() => castVote("up")}
              color="#22c55e"
            />
            <VoteButton
              label="En contra"
              icon="👎"
              active={myVote === "down" || (hasVoted && session.votes[selfId] === "down")}
              disabled={isClosed || hasVoted}
              onClick={() => castVote("down")}
              color="#ef4444"
            />
          </div>
        )}

        {session.type === "stars" && (
          <div style={{ display: "flex", gap: 4 }}>
            {[1, 2, 3, 4, 5].map((star) => {
              const voted = hasVoted && Number(session!.votes[selfId]) >= star;
              const hovering = myVote !== null && Number(myVote) >= star;
              return (
                <button
                  key={star}
                  onClick={() => castVote(star)}
                  disabled={isClosed || hasVoted}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: 24,
                    cursor: isClosed || hasVoted ? "default" : "pointer",
                    opacity: voted || hovering ? 1 : 0.3,
                    transition: "opacity 0.15s",
                  }}
                >
                  ⭐
                </button>
              );
            })}
          </div>
        )}

        {session.type === "dot" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {session.options.map((opt) => {
              const isSelected = myVote === opt || (hasVoted && session!.votes[selfId] === opt);
              const voteCount = Object.values(session!.votes).filter((v) => v === opt).length;
              return (
                <button
                  key={opt}
                  onClick={() => castVote(opt)}
                  disabled={isClosed || hasVoted}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: isSelected ? "2px solid #3b82f6" : "1px solid #e5e7eb",
                    backgroundColor: isSelected ? "#eff6ff" : "white",
                    cursor: isClosed || hasVoted ? "default" : "pointer",
                    fontSize: 13,
                    color: "#1f2937",
                  }}
                >
                  <span>{opt}</span>
                  {(isClosed || isCreator) && (
                    <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>{voteCount}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Live results for approval (always visible to creator) */}
      {session.type === "approval" && (isCreator || isClosed) && totalVoters > 0 && (
        <div style={{ padding: "0 16px 8px" }}>
          <LiveBar
            up={Object.values(session.votes).filter((v) => v === "up").length}
            down={Object.values(session.votes).filter((v) => v === "down").length}
          />
        </div>
      )}

      {/* Stars average */}
      {session.type === "stars" && (isCreator || isClosed) && totalVoters > 0 && (
        <div style={{ padding: "0 16px 8px", fontSize: 12, color: "#6b7280" }}>
          Promedio: {(Object.values(session.votes).map(Number).reduce((a, b) => a + b, 0) / totalVoters).toFixed(1)} de 5
        </div>
      )}

      {/* Voter avatars */}
      <div style={{ padding: "4px 16px 8px", display: "flex", gap: 4, flexWrap: "wrap" }}>
        {allUsers.map((user) => (
          <div
            key={user.id}
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              backgroundColor: voterIds.has(user.id) ? user.color : "#e5e7eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              color: voterIds.has(user.id) ? "white" : "#9ca3af",
              fontWeight: 600,
              transition: "all 0.3s",
            }}
            title={`${user.name}${voterIds.has(user.id) ? " (voto)" : " (pendiente)"}`}
          >
            {user.name[0]?.toUpperCase()}
          </div>
        ))}
      </div>

      {/* Close button (creator only) */}
      {isCreator && !isClosed && (
        <div style={{ padding: "4px 16px 12px" }}>
          <button
            onClick={closeVoting}
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: 8,
              border: "none",
              backgroundColor: "#1f2937",
              color: "white",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cerrar votacion ({totalVoters} votos)
          </button>
        </div>
      )}

      {/* Status */}
      {!isCreator && !isClosed && hasVoted && (
        <div style={{ padding: "4px 16px 12px", fontSize: 11, color: "#9ca3af", textAlign: "center" }}>
          Tu voto fue registrado. Esperando a que se cierre la votacion...
        </div>
      )}

      {isClosed && (
        <div style={{ padding: "4px 16px 12px", fontSize: 11, color: "#22c55e", textAlign: "center", fontWeight: 500 }}>
          Votacion cerrada — resultados agregados al canvas
        </div>
      )}
    </div>
  );
}

function VoteButton({ label, icon, active, disabled, onClick, color }: {
  label: string; icon: string; active: boolean; disabled: boolean; onClick: () => void; color: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: "10px",
        borderRadius: 8,
        border: active ? `2px solid ${color}` : "1px solid #e5e7eb",
        backgroundColor: active ? `${color}15` : "white",
        cursor: disabled ? "default" : "pointer",
        fontSize: 14,
        color: "#1f2937",
        opacity: disabled && !active ? 0.5 : 1,
        transition: "all 0.2s",
      }}
    >
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span style={{ fontSize: 12 }}>{label}</span>
    </button>
  );
}

function LiveBar({ up, down }: { up: number; down: number }) {
  const total = up + down;
  const upPct = total > 0 ? Math.round((up / total) * 100) : 0;
  return (
    <div style={{ display: "flex", borderRadius: 4, overflow: "hidden", height: 8 }}>
      <div style={{ width: `${upPct}%`, backgroundColor: "#22c55e", transition: "width 0.3s" }} />
      <div style={{ width: `${100 - upPct}%`, backgroundColor: "#ef4444", transition: "width 0.3s" }} />
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  width: 320,
  backgroundColor: "rgba(255,255,255,0.97)",
  backdropFilter: "blur(16px)",
  borderRadius: 12,
  boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
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
