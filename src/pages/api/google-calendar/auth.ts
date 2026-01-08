import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("[GoogleCalendar] Starting auth flow...");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[GoogleCalendar] Missing server configuration");
      return res.status(500).json({ error: "Server configuration error" });
    }

    // 1. Get Access Token from Header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.warn("[GoogleCalendar] Missing authorization header");
      return res.status(401).json({ error: "No authorization header" });
    }

    const token = authHeader.replace("Bearer ", "");
    
    // 2. Validate Session with Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error("[GoogleCalendar] Invalid session token:", userError);
      return res.status(401).json({ error: "Invalid or expired session" });
    }

    console.log("[GoogleCalendar] User authenticated:", user.id);

    // 3. Fetch Integration Credentials from DB
    const { data: integration, error: dbError } = await supabase
      .from("integration_settings")
      .select("settings")
      .eq("integration_name", "google_calendar")
      .single();

    if (dbError || !integration?.settings) {
      console.error("[GoogleCalendar] Integration settings not found:", dbError);
      return res.status(400).json({ error: "Google Calendar not configured in settings" });
    }

    const { clientId, clientSecret } = integration.settings;

    if (!clientId || !clientSecret) {
      console.error("[GoogleCalendar] Missing client ID or secret");
      return res.status(400).json({ error: "Invalid Google Calendar credentials" });
    }

    // 4. Generate Auth URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "";
    // Fallback to origin header if env var not set (useful for previews)
    const origin = req.headers.origin || "http://localhost:3000";
    const baseUrl = appUrl || origin;
    
    const redirectUri = `${baseUrl}/api/google-calendar/callback`;
    
    console.log("[GoogleCalendar] Using redirect URI:", redirectUri);

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    const scopes = [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      prompt: "consent", // Force consent to ensure refresh_token is returned
      state: user.id, // Pass user ID as state for security/validation in callback
      include_granted_scopes: true,
    });

    console.log("[GoogleCalendar] Auth URL generated successfully");

    return res.status(200).json({ authUrl });

  } catch (error) {
    console.error("[GoogleCalendar] Unexpected error:", error);
    return res.status(500).json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error" 
    });
  }
}