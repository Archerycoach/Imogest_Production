import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/integrations/supabase/client";

// Get credentials from database or fallback to environment variables
const getGoogleCredentials = async () => {
  // Try to get from database first
  const { data, error } = await supabase
    .from("integration_settings")
    .select("settings")
    .eq("integration_name", "google_calendar")
    .single();

  if (!error && data) {
    const settings = data.settings as any;
    if (settings?.clientId && settings?.clientSecret) {
      return {
        clientId: settings.clientId,
        clientSecret: settings.clientSecret,
      };
    }
  }

  // Fallback to environment variables
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (clientId && clientSecret) {
    return {
      clientId,
      clientSecret,
    };
  }

  return null;
};

// Dynamic redirect URI based on environment
const getRedirectUri = (req: NextApiRequest) => {
  // Check for environment variable first
  const envRedirectUri = process.env.GOOGLE_REDIRECT_URI || process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI;
  if (envRedirectUri) {
    return envRedirectUri;
  }

  // Fallback to dynamic URL construction
  const protocol = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:3000";
  return `${protocol}://${host}/api/google-calendar/callback`;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // 1. Verificar credenciais
    const credentials = await getGoogleCredentials();
    
    if (!credentials) {
      console.error("No Google Calendar credentials available");
      return res.status(500).json({ 
        error: "Google Calendar não está configurado. Por favor configure as credenciais em /admin/integrations ou use variáveis de ambiente." 
      });
    }

    // 2. Construir URL de autorização
    const redirectUri = getRedirectUri(req);
    
    const scope = [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/userinfo.email"
    ].join(" ");

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${credentials.clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;

    console.log("🚀 Initiating Google OAuth flow", { 
      redirect_uri: redirectUri,
      has_client_id: !!credentials.clientId 
    });

    // 3. Redirecionar para o Google
    res.redirect(authUrl);
  } catch (error) {
    console.error("Error in Google OAuth init:", error);
    res.status(500).json({ error: "Failed to initiate Google OAuth flow" });
  }
}