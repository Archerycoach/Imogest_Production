import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("🔑 Initiating Google OAuth with auth token...");

    // Get user from Authorization header (same pattern as send-email.ts)
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.error("❌ Missing authorization header");
      return res.status(401).json({ error: "Missing authorization header" });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error("❌ Authentication failed:", authError);
      return res.status(401).json({ error: "Not authenticated. Please log in first." });
    }

    console.log("✅ User authenticated:", user.id);

    // Get Google OAuth credentials from database
    const { data: settings, error: settingsError } = await (supabaseAdmin as any)
      .from("integration_settings")
      .select("*")
      .eq("integration_name", "google_calendar")
      .eq("is_active", true)
      .single();

    if (settingsError || !settings?.google_client_id || !settings?.google_client_secret) {
      console.error("❌ Google Calendar not configured");
      return res.status(400).json({
        error: "Google Calendar integration not configured. Please configure it in admin settings.",
      });
    }

    const { google_client_id, google_redirect_uri } = settings;

    // Build Google OAuth URL
    const params = new URLSearchParams({
      client_id: google_client_id,
      redirect_uri: google_redirect_uri,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar",
      access_type: "offline",
      prompt: "consent",
      state: user.id, // Pass user ID in state
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    console.log("✅ OAuth URL generated, redirecting...");
    return res.status(200).json({ authUrl });

  } catch (error: any) {
    console.error("❌ Error in Google OAuth init:", error);
    res.status(500).json({ error: "Failed to initiate Google OAuth flow" });
  }
}