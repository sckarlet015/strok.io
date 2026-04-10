"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { useEffect, useState } from "react";

function isCapacitorEnv(): boolean {
  if (typeof window === "undefined") return false;
  // Check Capacitor native bridge
  if ((window as unknown as Record<string, unknown>).Capacitor) return true;
  // Check known Capacitor origins
  const origin = window.location.origin;
  if (origin.includes("capacitor://")) return true;
  // Android emulator accessing host dev server
  if (origin.includes("10.0.2.2")) return true;
  return false;
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isCapacitor, setIsCapacitor] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setIsCapacitor(isCapacitorEnv());
    setReady(true);
  }, []);

  if (!ready) return null;

  // Skip Clerk in Capacitor WebView — auth handled differently in native app
  if (isCapacitor) {
    return <>{children}</>;
  }

  return <ClerkProvider>{children}</ClerkProvider>;
}
