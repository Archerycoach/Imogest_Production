import type { NextApiRequest, NextApiResponse } from "next";
import { exchangeCodeForTokens, storeTokens } from "@/services/googleCalendarService";
import { createPagesServerClient } from "@/lib/supabase-server";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { code, error, state } = req.query;

  console.log("[Google Calendar Callback] Received request:", {
    hasCode: !!code,
    hasError: !!error,
    hasState: !!state,
    error: error || "none"
  });

  if (error) {
    console.error("[Google Calendar Callback] OAuth error:", error);
    return res.redirect("/settings?calendar_error=oauth_denied");
  }

  if (!code || typeof code !== "string") {
    console.error("[Google Calendar Callback] No authorization code received");
    return res.redirect("/settings?calendar_error=no_code");
  }

  try {
    // Get authenticated user
    const supabase = createPagesServerClient({ req, res });
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("[Google Calendar Callback] Session error:", sessionError);
      return res.redirect("/login?error=session_error");
    }

    if (!session?.user) {
      console.error("[Google Calendar Callback] No authenticated user");
      return res.redirect("/login?error=unauthorized");
    }

    console.log("[Google Calendar Callback] Exchanging code for tokens for user:", session.user.id);

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    console.log("[Google Calendar Callback] Tokens received, storing in database");

    // Store tokens in database
    await storeTokens(session.user.id, tokens);

    console.log("[Google Calendar Callback] Integration successful, redirecting to settings");

    // Redirect to settings with success message
    return res.redirect("/settings?calendar_success=true");
  } catch (error) {
    console.error("[Google Calendar Callback] Error during token exchange:", error);
    const errorMessage = error instanceof Error ? error.message : "unknown_error";
    return res.redirect(`/settings?calendar_error=token_exchange_failed&details=${encodeURIComponent(errorMessage)}`);
  }
}