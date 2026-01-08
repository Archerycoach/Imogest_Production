/**
 * Session Manager
 * 
 * Robust session management system that:
 * - Validates sessions before critical operations
 * - Auto-refreshes tokens when near expiry
 * - Handles session expiration gracefully
 * - Provides clear error messages
 */

import { supabase } from "@/integrations/supabase/client";

export interface SessionValidationResult {
  isValid: boolean;
  needsRefresh: boolean;
  expiresAt?: number;
  error?: string;
}

export class SessionManager {
  private static readonly REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry
  private static readonly MAX_RETRY_ATTEMPTS = 3;
  private static refreshInProgress = false;

  /**
   * Validates current session and returns detailed status
   */
  static async validateSession(): Promise<SessionValidationResult> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error("[SessionManager] Error getting session:", error);
        return {
          isValid: false,
          needsRefresh: false,
          error: error.message,
        };
      }

      if (!session) {
        console.warn("[SessionManager] No active session found");
        return {
          isValid: false,
          needsRefresh: false,
          error: "No active session",
        };
      }

      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;

      console.log("[SessionManager] Session validation:", {
        expiresAt: new Date(expiresAt).toISOString(),
        timeUntilExpiry: `${Math.floor(timeUntilExpiry / 1000 / 60)} minutes`,
        needsRefresh: timeUntilExpiry < this.REFRESH_THRESHOLD,
      });

      return {
        isValid: true,
        needsRefresh: timeUntilExpiry < this.REFRESH_THRESHOLD,
        expiresAt,
      };
    } catch (error) {
      console.error("[SessionManager] Unexpected error:", error);
      return {
        isValid: false,
        needsRefresh: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Refreshes the current session
   */
  static async refreshSession(attempt = 1): Promise<boolean> {
    // Prevent concurrent refresh attempts
    if (this.refreshInProgress) {
      console.log("[SessionManager] Refresh already in progress, waiting...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return this.refreshSession(attempt);
    }

    if (attempt > this.MAX_RETRY_ATTEMPTS) {
      console.error("[SessionManager] Max refresh attempts reached");
      return false;
    }

    this.refreshInProgress = true;

    try {
      console.log(`[SessionManager] Attempting session refresh (attempt ${attempt}/${this.MAX_RETRY_ATTEMPTS})`);

      const { data: { session }, error } = await supabase.auth.refreshSession();

      if (error) {
        console.error("[SessionManager] Refresh error:", error);
        
        // Retry on network errors
        if (error.message.includes("network") || error.message.includes("fetch")) {
          console.log("[SessionManager] Network error, retrying...");
          await new Promise((resolve) => setTimeout(resolve, 2000));
          this.refreshInProgress = false;
          return this.refreshSession(attempt + 1);
        }

        this.refreshInProgress = false;
        return false;
      }

      if (!session) {
        console.error("[SessionManager] No session returned after refresh");
        this.refreshInProgress = false;
        return false;
      }

      console.log("[SessionManager] Session refreshed successfully", {
        expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : "unknown",
      });

      this.refreshInProgress = false;
      return true;
    } catch (error) {
      console.error("[SessionManager] Unexpected refresh error:", error);
      this.refreshInProgress = false;
      return false;
    }
  }

  /**
   * Validates and refreshes session if needed
   * Returns true if session is valid and ready to use
   */
  static async ensureValidSession(): Promise<boolean> {
    const validation = await this.validateSession();

    if (!validation.isValid) {
      console.error("[SessionManager] Session invalid:", validation.error);
      return false;
    }

    if (validation.needsRefresh) {
      console.log("[SessionManager] Session needs refresh, attempting...");
      const refreshed = await this.refreshSession();
      
      if (!refreshed) {
        console.error("[SessionManager] Failed to refresh session");
        return false;
      }
    }

    return true;
  }

  /**
   * Gets current user ID if session is valid
   */
  static async getCurrentUserId(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id || null;
  }

  /**
   * Handles session expiration by redirecting to login
   */
  static handleSessionExpired(router: any): void {
    console.warn("[SessionManager] Session expired, redirecting to login");
    
    // Clear any stale session data
    localStorage.removeItem("supabase.auth.token");
    
    // Redirect to login with return URL
    const currentPath = window.location.pathname;
    router.push(`/login?returnUrl=${encodeURIComponent(currentPath)}`);
  }

  /**
   * Checks if error is session-related
   */
  static isSessionError(error: any): boolean {
    const sessionErrorMessages = [
      "session expired",
      "invalid session",
      "no session",
      "jwt expired",
      "invalid jwt",
      "refresh_token_not_found",
      "invalid_grant",
    ];

    const errorMessage = error?.message?.toLowerCase() || "";
    return sessionErrorMessages.some((msg) => errorMessage.includes(msg));
  }
}