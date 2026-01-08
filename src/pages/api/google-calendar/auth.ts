import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/integrations/supabase/client";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log("🔍 === /api/google-calendar/auth called ===");
  console.log("Method:", req.method);
  console.log("Cookies:", Object.keys(req.cookies));

  if (req.method !== "GET") {
    console.error("❌ Invalid method:", req.method);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get session from cookies (Supabase automatically sets cookies on login)
    const supabaseAccessToken = req.cookies['sb-access-token'];
    const supabaseRefreshToken = req.cookies['sb-refresh-token'];

    console.log("🍪 Cookies check:", {
      hasAccessToken: !!supabaseAccessToken,
      hasRefreshToken: !!supabaseRefreshToken,
      accessTokenLength: supabaseAccessToken?.length || 0
    });

    if (!supabaseAccessToken) {
      console.error("❌ No session cookie found");
      return res.status(401).json({ 
        error: "Unauthorized. Please login first.",
        debug: { reason: "no_session_cookie" }
      });
    }

    // Validate the session token
    console.log("🔐 Validating session token...");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(supabaseAccessToken);

    if (userError || !user) {
      console.error("❌ Session validation failed:", userError?.message);
      return res.status(401).json({ 
        error: "Invalid session. Please login again.",
        debug: { 
          reason: "invalid_session",
          error: userError?.message 
        }
      });
    }

    console.log("✅ User authenticated:", {
      userId: user.id,
      email: user.email
    });

    // Get Google OAuth credentials from integration_settings
    console.log("📋 Fetching Google OAuth credentials...");
    const { data: settings, error } = await supabaseAdmin
      .from("integration_settings")
      .select("settings, is_active")
      .eq("integration_name", "google_calendar")
      .eq("is_active", true)
      .single();

    if (error || !settings) {
      console.error("❌ Google Calendar credentials not found:", error);
      return res.status(400).json({ 
        error: "Google Calendar integration not configured. Please configure it in admin settings." 
      });
    }

    const { clientId, clientSecret, redirectUri } = settings.settings as any;

    if (!clientId || !clientSecret || !redirectUri) {
      console.error("❌ Missing OAuth credentials");
      return res.status(400).json({ 
        error: "Missing OAuth credentials. Please check integration settings." 
      });
    }

    console.log("✅ OAuth credentials loaded:", {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      redirectUri
    });

    // Build Google OAuth URL
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events",
      access_type: "offline",
      prompt: "consent",
      state: user.id,
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    console.log("✅ Redirecting to Google OAuth...");
    console.log("Auth URL:", authUrl.substring(0, 150) + "...");

    return res.redirect(302, authUrl);

  } catch (error: any) {
    console.error("❌ Unexpected error:", {
      message: error.message,
      stack: error.stack
    });
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : "Internal server error" 
    });
  }
}