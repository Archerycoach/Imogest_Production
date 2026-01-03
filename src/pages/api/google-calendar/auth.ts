import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Get credentials from database ONLY (no env fallback)
const getGoogleCredentials = async () => {
  const { data, error } = await supabaseAdmin
    .from("integration_settings")
    .select("settings")
    .eq("integration_name", "google_calendar")
    .single();

  if (error || !data) {
    console.error("❌ Failed to fetch Google Calendar settings from database:", error);
    return null;
  }

  const settings = data.settings as any;
  
  if (!settings?.clientId || !settings?.clientSecret || !settings?.redirectUri) {
    console.error("❌ Incomplete Google Calendar credentials in database");
    return null;
  }

  console.log("✅ Google Calendar credentials loaded from database");
  return {
    clientId: settings.clientId,
    clientSecret: settings.clientSecret,
    redirectUri: settings.redirectUri,
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    console.log("\n🚀 Initiating Google OAuth flow");

    // Get credentials from database
    const credentials = await getGoogleCredentials();
    
    if (!credentials) {
      console.error("❌ No Google Calendar credentials available");
      return res.status(500).json({ 
        error: "Google Calendar não está configurado. Por favor configure as credenciais em /admin/integrations" 
      });
    }

    console.log("🔗 Using redirect URI:", credentials.redirectUri);

    // Build authorization URL
    const scope = [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/userinfo.email"
    ].join(" ");

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${credentials.clientId}&redirect_uri=${encodeURIComponent(credentials.redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;

    console.log("✅ Redirecting to Google OAuth...");

    // Redirect to Google
    res.redirect(authUrl);
  } catch (error) {
    console.error("❌ Error in Google OAuth init:", error);
    res.status(500).json({ error: "Failed to initiate Google OAuth flow" });
  }
}