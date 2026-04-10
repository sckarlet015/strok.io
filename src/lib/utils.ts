export function generateRandomColor(): string {
  const colors = [
    "#ef4444",
    "#f97316",
    "#eab308",
    "#22c55e",
    "#06b6d4",
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
    "#f43f5e",
    "#14b8a6",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

export function generateRandomName(): string {
  const names = [
    "Azul",
    "Rojo",
    "Verde",
    "Naranja",
    "Morado",
    "Rosa",
    "Cyan",
    "Amarillo",
    "Lima",
    "Coral",
  ];
  return names[Math.floor(Math.random() * names.length)];
}

export interface RecentRoom {
  roomId: string;
  visitedAt: string;
}

const RECENT_ROOMS_KEY = "strok-recent-rooms";
const MAX_RECENT = 5;

export function saveRecentRoom(roomId: string) {
  const rooms = getRecentRooms().filter((r) => r.roomId !== roomId);
  rooms.unshift({ roomId, visitedAt: new Date().toISOString() });
  localStorage.setItem(
    RECENT_ROOMS_KEY,
    JSON.stringify(rooms.slice(0, MAX_RECENT))
  );
}

export function getRecentRooms(): RecentRoom[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_ROOMS_KEY) || "[]");
  } catch {
    return [];
  }
}
