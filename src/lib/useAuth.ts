"use client";

import { useUser as useClerkUser } from "@clerk/nextjs";

/**
 * Safe auth hook that works with and without ClerkProvider.
 * In Capacitor (no ClerkProvider), returns a guest state.
 */
export function useAuth() {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const clerk = useClerkUser();
    return {
      isSignedIn: clerk.isSignedIn ?? false,
      isLoaded: clerk.isLoaded,
      user: clerk.user,
      isGuest: false,
    };
  } catch {
    // ClerkProvider not available (Capacitor mode)
    return {
      isSignedIn: false,
      isLoaded: true,
      user: null,
      isGuest: true,
    };
  }
}
