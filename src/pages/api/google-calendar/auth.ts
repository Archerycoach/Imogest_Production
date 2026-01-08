import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/integrations/supabase/client";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { google } from "googleapis";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    console.log("🔍 === /api/google-calendar/auth called ===");
    console.log("Method:", req.method);
    console.log("Headers:", {
      origin: req.headers.origin,
      referer: req.headers.referer,
      cookie: req.headers.cookie ? "present" : "missing",
    });

    // Get session from Supabase cookies (automatic)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    console.log("🔐 Session check:", {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      error: sessionError?.message,
    });

    if (sessionError || !session?.user) {
      console.error("❌ No valid session found:", sessionError?.message || "Session is null");
      return res.status(401).json({ 
        error: "Unauthorized. Please login first.",
        debug: {
          reason: sessionError ? "session_error" : "no_session_cookie"
        }
      });
    }

    const userId = session.user.id;
    console.log("✅ Valid session for user:", userId);

    // Get OAuth credentials from database (integration_settings)
    console.log("🔍 Fetching OAuth credentials for google_calendar");
    const { data: settingsData, error: credError } = await supabaseAdmin
      .from("integration_settings")
      .select("settings")
      .eq("integration_name", "google_calendar")
      .single();

    if (credError || !settingsData?.settings) {
      console.error("❌ OAuth credentials not found:", credError?.message);
      return res.status(400).json({ 
        error: "Google Calendar credentials not configured. Please contact support." 
      });
    }

    // Parse settings safely
    const settings = settingsData.settings as Record<string, any>;
    const clientId = settings.clientId || settings.client_id;
    const clientSecret = settings.clientSecret || settings.client_secret;

    if (!clientId || !clientSecret) {
      console.error("❌ Incomplete OAuth credentials in settings");
      return res.status(400).json({ 
        error: "Invalid Google Calendar configuration." 
      });
    }

    console.log("✅ OAuth credentials found");

    // Generate OAuth URL
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/google-calendar/callback`
    );

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/calendar.events",
      ],
      state: userId,
      prompt: "consent",
    });

    console.log("✅ Auth URL generated successfully");
    console.log("🔗 Returning authUrl to frontend for redirect");

    // Return the auth URL as JSON instead of redirecting
    return res.status(200).json({ authUrl });
    
  } catch (error) {
    console.error("❌ Error in /api/google-calendar/auth:", error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : "Internal server error" 
    });
  }
}