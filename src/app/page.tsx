"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserButton, SignInButton } from "@clerk/nextjs";
import { getRecentRooms, RecentRoom } from "@/lib/utils";
import { useAuth } from "@/lib/useAuth";

export default function Home() {
  const router = useRouter();
  const { isSignedIn, isLoaded, isGuest } = useAuth();
  const [recentRooms, setRecentRooms] = useState<RecentRoom[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    setRecentRooms(getRecentRooms());
  }, []);

  const handleNewRoom = () => {
    // crypto.randomUUID() not available in Android WebView over HTTP
    const roomId = crypto.randomUUID?.() ??
      Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, "$1-$2-$3-$4-$5");
    router.push(`/room/${roomId}`);
  };

  const copyLink = (roomId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}`);
    setCopied(roomId);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <main className="min-h-[100dvh] bg-[#1a1a2e] flex flex-col items-center justify-center text-white font-[family-name:var(--font-geist-sans)] relative px-4 pb-[env(safe-area-inset-bottom)]">
      {/* Auth button (hidden in Capacitor guest mode) */}
      {!isGuest && (
        <div className="absolute top-6 right-6">
          {isLoaded && (
            isSignedIn ? (
              <UserButton />
            ) : (
              <SignInButton mode="modal">
                <button className="bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors">
                  Iniciar sesion
                </button>
              </SignInButton>
            )
          )}
        </div>
      )}

      <h1 className="text-4xl sm:text-5xl font-bold mb-4">Strok.io</h1>
      <p className="text-gray-400 mb-8 sm:mb-12 text-base sm:text-lg text-center">
        Pizarra colaborativa en tiempo real
      </p>

      <div className="flex flex-col gap-6 w-full max-w-sm">
        <button
          onClick={handleNewRoom}
          className="bg-white text-[#1a1a2e] font-semibold py-3 px-6 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Nueva pizarra
        </button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-600" />
          <span className="text-gray-500 text-sm">o</span>
          <div className="h-px flex-1 bg-gray-600" />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const roomId = formData.get("roomId") as string;
            if (roomId.trim()) {
              router.push(`/room/${roomId.trim()}`);
            }
          }}
          className="flex gap-2"
        >
          <input
            name="roomId"
            type="text"
            placeholder="ID de pizarra existente"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
          />
          <button
            type="submit"
            className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Unirse
          </button>
        </form>

        {/* Recent rooms */}
        {recentRooms.length > 0 && (
          <div className="mt-4">
            <h2 className="text-sm text-gray-400 mb-3">Salas recientes</h2>
            <div className="flex flex-col gap-2">
              {recentRooms.map((room) => (
                <div
                  key={room.roomId}
                  className="flex items-center justify-between bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 hover:border-gray-500 transition-colors"
                >
                  <button
                    onClick={() => router.push(`/room/${room.roomId}`)}
                    className="flex flex-col items-start flex-1 min-w-0"
                  >
                    <span className="text-sm text-white truncate w-full text-left">
                      {room.roomId.slice(0, 8)}...
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(room.visitedAt).toLocaleDateString("es", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyLink(room.roomId);
                    }}
                    className="ml-3 text-gray-400 hover:text-white transition-colors text-xs shrink-0"
                  >
                    {copied === room.roomId ? "Copiado!" : "Copiar link"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
