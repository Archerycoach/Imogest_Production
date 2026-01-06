import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Accept both GET and POST methods
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("🔐 Starting Google Calendar OAuth flow...");

    // Extract auth token from Authorization header OR body
    const authHeader = req.headers.authorization;
    const authToken = authHeader?.replace("Bearer ", "") || req.body?.token;

    if (!authToken) {
      console.error("❌ No authentication token provided");
      return res.status(401).json({ 
        error: "Not authenticated. Please provide auth token." 
      });
    }

    console.log("🔑 Using auth token from", authHeader ? "header" : "body");

    // Initialize Supabase client with auth token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { persistSession: false },
        global: {
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      }
    );

    // Get user from session
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (!user || userError) {
      console.error("❌ Authentication failed:", userError?.message);
      return res.status(401).json({ 
        error: "Not authenticated. Please log in first." 
      });
    }

    console.log("✅ User authenticated:", user.id);

    // Get Google Calendar credentials from integration_settings
    const { data: settings, error: settingsError } = await supabase
      .from("integration_settings")
      .select("settings, is_active")
      .eq("integration_name", "google_calendar")
      .single();

    if (settingsError || !settings) {
      console.error("❌ Failed to fetch Google Calendar settings:", settingsError?.message);
      return res.status(500).json({ 
        error: "Google Calendar integration not configured" 
      });
    }

    if (!settings.is_active) {
      console.error("❌ Google Calendar integration is not active");
      return res.status(500).json({ 
        error: "Google Calendar integration is not active" 
      });
    }

    console.log("✅ Google Calendar integration is active");

    // Extract OAuth credentials from settings
    const { clientId, redirectUri } = settings.settings as any;

    if (!clientId || !redirectUri) {
      console.error("❌ Missing required OAuth credentials in settings");
      return res.status(500).json({ 
        error: "Google Calendar OAuth credentials not configured" 
      });
    }

    console.log("✅ OAuth credentials loaded from database");
    console.log("📍 Redirect URI:", redirectUri);

    // Build OAuth URL
    const scopes = [
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/calendar.events",
    ].join(" ");

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.append("client_id", clientId);
    authUrl.searchParams.append("redirect_uri", redirectUri);
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append("scope", scopes);
    authUrl.searchParams.append("access_type", "offline");
    authUrl.searchParams.append("prompt", "consent");
    authUrl.searchParams.append("state", user.id);

    console.log("🔗 Redirecting to Google OAuth:", authUrl.toString());

    // Redirect to Google OAuth
    return res.redirect(302, authUrl.toString());
  } catch (error: any) {
    console.error("❌ Google Calendar auth error:", error);
    return res.status(500).json({ 
      error: "Failed to initiate Google Calendar authentication",
      details: error.message 
    });
  }
}