/**
 * useSessionRefresh Hook
 * 
 * Automatically monitors and refreshes user session
 * - Checks session validity every 5 minutes
 * - Refreshes when token is near expiry
 * - Redirects to login if session cannot be recovered
 */

import { useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { SessionManager } from "@/lib/sessionManager";

export function useSessionRefresh() {
  const router = useRouter();
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Initial check on mount
    checkAndRefreshSession();

    // Set up periodic checks every 5 minutes
    intervalRef.current = setInterval(checkAndRefreshSession, 5 * 60 * 1000);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const checkAndRefreshSession = async () => {
    try {
      const validation = await SessionManager.validateSession();

      if (!validation.isValid) {
        console.warn("[useSessionRefresh] Session invalid, redirecting to login");
        SessionManager.handleSessionExpired(router);
        return;
      }

      if (validation.needsRefresh) {
        console.log("[useSessionRefresh] Session needs refresh, attempting...");
        const refreshed = await SessionManager.refreshSession();

        if (!refreshed) {
          console.error("[useSessionRefresh] Failed to refresh session, redirecting to login");
          SessionManager.handleSessionExpired(router);
        }
      }
    } catch (error) {
      console.error("[useSessionRefresh] Error checking session:", error);
    }
  };
}