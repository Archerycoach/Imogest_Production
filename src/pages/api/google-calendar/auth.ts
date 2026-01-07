import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log("🔍 === /api/google-calendar/auth called ===");
  console.log("Method:", req.method);
  console.log("Query params:", JSON.stringify(req.query, null, 2));
  console.log("Headers:", {
    origin: req.headers.origin,
    referer: req.headers.referer,
    userAgent: req.headers["user-agent"]?.substring(0, 50)
  });

  if (req.method !== "GET") {
    console.error("❌ Invalid method:", req.method);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 1. Get token from query parameter
    const token = req.query.token as string;

    console.log("🔑 Token received:", {
      exists: !!token,
      type: typeof token,
      length: token?.length || 0,
      preview: token ? token.substring(0, 50) + "..." : "null",
      isUndefinedString: token === "undefined",
      isNullString: token === "null"
    });

    if (!token || token === "undefined" || token === "null") {
      console.error("❌ Missing or invalid token");
      return res.status(401).json({ 
        error: "Missing authorization token. Please try logging in again.",
        debug: {
          tokenReceived: token,
          tokenType: typeof token
        }
      });
    }

    // 2. Validate token using Admin client
    console.log("🔐 Validating token with Supabase Admin...");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError) {
      console.error("❌ Token validation failed:", {
        error: userError.message,
        status: userError.status,
        name: userError.name
      });
      return res.status(401).json({ 
        error: "Invalid or expired token. Please refresh the page and try again.",
        debug: {
          supabaseError: userError.message
        }
      });
    }

    if (!user) {
      console.error("❌ No user returned from token validation");
      return res.status(401).json({ 
        error: "Invalid or expired token. Please refresh the page and try again." 
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