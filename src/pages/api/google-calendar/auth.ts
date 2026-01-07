import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get user from Authorization header or query parameter
    const authHeader = req.headers.authorization;
    const tokenFromQuery = req.query.token as string;
    
    console.log("🔍 Auth endpoint called");
    console.log("Authorization header:", authHeader ? "present" : "missing");
    console.log("Token from query:", tokenFromQuery ? `present (${tokenFromQuery.substring(0, 20)}...)` : "missing");
    
    const token = authHeader 
      ? authHeader.replace("Bearer ", "")
      : tokenFromQuery;

    if (!token) {
      console.error("❌ No token found in request");
      return res.status(401).json({ error: "Missing authorization token" });
    }

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error("❌ Token validation failed:", userError);
      return res.status(401).json({ error: "Unauthorized" });
    }

    console.log("✅ User authenticated:", user.id);

    // Get Google OAuth credentials from integration_settings
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

    console.log("✅ OAuth credentials loaded");

    // Build Google OAuth URL
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events",
      access_type: "offline",
      prompt: "consent",
      state: user.id, // Pass user ID in state
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    console.log("✅ Redirecting to Google OAuth...");

    // Server-side redirect instead of returning JSON
    return res.redirect(302, authUrl);

  } catch (error: any) {
    console.error("❌ Error in auth handler:", error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : "Internal server error" 
    });
  }
}