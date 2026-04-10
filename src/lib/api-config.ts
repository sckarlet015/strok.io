/**
 * Returns the base URL for API calls.
 * - Web: relative paths (e.g., "/api/ai-generate")
 * - Capacitor (native app): points to the deployed server
 */
export function getApiBase(): string {
  // In Capacitor, window.location.origin is "capacitor://localhost" (iOS) or "http://localhost" (Android)
  if (
    typeof window !== "undefined" &&
    (window.location.protocol === "capacitor:" ||
      window.location.hostname === "localhost" && navigator.userAgent.includes("CapacitorApp"))
  ) {
    return process.env.NEXT_PUBLIC_API_URL || "";
  }
  return "";
}

/**
 * Build a full API URL.
 * Usage: apiUrl("/api/ai-generate") => "https://strok.io/api/ai-generate" (native) or "/api/ai-generate" (web)
 */
export function apiUrl(path: string): string {
  return `${getApiBase()}${path}`;
}
