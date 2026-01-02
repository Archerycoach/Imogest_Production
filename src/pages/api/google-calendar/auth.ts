import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/integrations/supabase/client";

// Get credentials from database
const getGoogleCredentials = async () => {
  const { data, error } = await supabase
    .from("integration_settings")
    .select("settings")
    .eq("integration_name", "google_calendar")
    .single();

  if (error || !data) {
    console.error("Failed to fetch Google Calendar credentials:", error);
    return null;
  }

  const settings = data.settings as any;

  return {
    clientId: settings?.client_id || "",
    clientSecret: settings?.client_secret || "",
  };
};

// Dynamic redirect URI based on environment
const getRedirectUri = (req: NextApiRequest) => {
  const protocol = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:3000";
  return `${protocol}://${host}/api/google-calendar/callback`;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get credentials from database
    const credentials = await getGoogleCredentials();
    
    if (!credentials || !credentials.clientId) {
      return res.status(500).json({ 
        error: "Google Calendar não está configurado. Por favor configure as credenciais em /admin/integrations" 
      });
    }

    const redirectUri = getRedirectUri(req);
    
    console.log("🔐 Google OAuth Init:", {
      client_id: credentials.clientId ? "✅ Present" : "❌ Missing",
      redirect_uri: redirectUri,
      environment: process.env.NODE_ENV,
    });

    // Build Google OAuth URL
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.append("client_id", credentials.clientId);
    authUrl.searchParams.append("redirect_uri", redirectUri);
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append("scope", "https://www.googleapis.com/auth/calendar");
    authUrl.searchParams.append("access_type", "offline");
    authUrl.searchParams.append("prompt", "consent");

    res.redirect(authUrl.toString());
  } catch (error) {
    console.error("Error initiating Google OAuth:", error);
    res.status(500).json({ error: "Failed to initiate Google OAuth" });
  }
}