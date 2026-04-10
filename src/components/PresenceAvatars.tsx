"use client";

import { useOthers, useSelf } from "@/lib/liveblocks.config";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function PresenceAvatars() {
  const others = useOthers();
  const self = useSelf();

  const MAX_SHOWN = 4;
  const allUsers = [
    ...(self
      ? [{ name: self.presence.name, color: self.presence.color, isSelf: true }]
      : []),
    ...others.map((o) => ({
      name: o.presence.name,
      color: o.presence.color,
      isSelf: false,
    })),
  ];

  const shown = allUsers.slice(0, MAX_SHOWN);
  const remaining = allUsers.length - MAX_SHOWN;

  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {shown.map((user, i) => (
        <div
          key={i}
          title={user.isSelf ? `${user.name} (tu)` : user.name}
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            backgroundColor: user.color,
            color: "white",
            fontSize: 11,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid white",
            marginLeft: i > 0 ? -8 : 0,
            zIndex: MAX_SHOWN - i,
            position: "relative",
            cursor: "default",
          }}
        >
          {getInitials(user.name)}
        </div>
      ))}
      {remaining > 0 && (
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            backgroundColor: "#6b7280",
            color: "white",
            fontSize: 11,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid white",
            marginLeft: -8,
            position: "relative",
          }}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}
