import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Database } from "@/integrations/supabase/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get auth token from cookie or header
    const token = req.cookies["sb-access-token"] || req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      console.error("No auth token found in request");
      return res.status(401).json({ error: "Not authenticated. Please log in first." });
    }

    // Create Supabase client with the user's token
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    // Verify the user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Auth error:", authError);
      return res.status(401).json({ error: "Not authenticated. Please log in first." });
    }

    console.log("🔐 User authenticated:", user.id);

    // Get Google OAuth credentials from database
    const { data: settings, error: settingsError } = await (supabaseAdmin as any)
      .from("integration_settings")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (settingsError || !settings?.google_client_id || !settings?.google_client_secret) {
      console.error("Missing Google OAuth credentials:", settingsError);
      return res.status(400).json({
        error: "Google OAuth credentials not configured. Please configure them in integration settings.",
      });
    }

    // Build OAuth URL
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/google-calendar/callback`;
    const scope = "https://www.googleapis.com/auth/calendar";

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", settings.google_client_id);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", scope);
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("state", user.id); // Pass user ID in state

    console.log("🔗 Redirecting to Google OAuth:", authUrl.toString());

    return res.status(200).json({ url: authUrl.toString() });
  } catch (error) {
    console.error("Error in Google Calendar auth init:", error);
    res.status(500).json({ error: "Failed to initiate Google OAuth flow" });
  }
}