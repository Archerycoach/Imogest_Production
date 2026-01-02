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
    clientId: settings?.clientId || "",
    clientSecret: settings?.clientSecret || "",
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
    const { code, error, error_description } = req.query;

    // Handle OAuth errors from Google
    if (error) {
      console.error("Google OAuth error:", error, error_description);
      const errorUrl = new URL("/admin/integrations", req.headers.origin || "http://localhost:3000");
      
      let errorMessage = "Erro ao conectar Google Calendar";
      
      if (error === "access_denied") {
        errorMessage = "Acesso negado. Por favor autorize o acesso ao calendário.";
      } else if (error_description) {
        errorMessage = String(error_description);
      }
      
      errorUrl.searchParams.append("google_error", errorMessage);
      return res.redirect(errorUrl.toString());
    }

    if (!code || typeof code !== "string") {
      console.error("No authorization code provided");
      return res.status(400).json({ error: "No authorization code provided" });
    }

    // Get credentials from database
    const credentials = await getGoogleCredentials();
    
    if (!credentials || !credentials.clientId || !credentials.clientSecret) {
      console.error("Missing Google OAuth credentials in database");
      const errorUrl = new URL("/admin/integrations", req.headers.origin || "http://localhost:3000");
      errorUrl.searchParams.append("google_error", "Configuração OAuth incompleta. Por favor configure Client ID e Client Secret em /admin/integrations.");
      return res.redirect(errorUrl.toString());
    }

    const redirectUri = getRedirectUri(req);

    console.log("🔐 Exchanging code for tokens...", {
      redirect_uri: redirectUri,
      has_code: !!code,
    });
    
    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error("Token exchange failed:", errorData);
      
      let errorMessage = "Falha ao obter tokens do Google";
      
      if (errorData.error === "invalid_grant") {
        errorMessage = "Código de autorização inválido ou expirado. Tente novamente.";
      } else if (errorData.error === "invalid_client") {
        errorMessage = "Credenciais OAuth inválidas. Verifique Client ID e Secret em /admin/integrations.";
      } else if (errorData.error === "redirect_uri_mismatch") {
        errorMessage = "Redirect URI não corresponde. Verifique configuração no Google Cloud.";
      }
      
      const errorUrl = new URL("/admin/integrations", req.headers.origin || "http://localhost:3000");
      errorUrl.searchParams.append("google_error", errorMessage);
      return res.redirect(errorUrl.toString());
    }

    const tokens = await tokenResponse.json();
    
    console.log("✅ Tokens received successfully");

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      const errorUrl = new URL("/admin/integrations", req.headers.origin || "http://localhost:3000");
      errorUrl.searchParams.append("google_error", "Utilizador não autenticado");
      return res.redirect(errorUrl.toString());
    }

    // Save tokens to user_integrations table
    const { error: saveError } = await supabase
      .from("user_integrations")
      .upsert({
        user_id: user.id,
        integration_type: "google_calendar",
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        token_expiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        is_active: true,
      }, {
        onConflict: "user_id,integration_type",
      });

    if (saveError) {
      console.error("Error saving tokens:", saveError);
      const errorUrl = new URL("/admin/integrations", req.headers.origin || "http://localhost:3000");
      errorUrl.searchParams.append("google_error", "Erro ao guardar tokens");
      return res.redirect(errorUrl.toString());
    }

    // Redirect back to integrations with success message
    const redirectUrl = new URL("/admin/integrations", req.headers.origin || "http://localhost:3000");
    redirectUrl.searchParams.append("google_calendar", "success");

    res.redirect(redirectUrl.toString());
  } catch (error) {
    console.error("Error in Google OAuth callback:", error);
    const errorUrl = new URL("/admin/integrations", req.headers.origin || "http://localhost:3000");
    errorUrl.searchParams.append("google_error", "Erro inesperado ao conectar. Tente novamente.");
    res.redirect(errorUrl.toString());
  }
}