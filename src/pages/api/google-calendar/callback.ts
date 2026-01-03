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
  const { code, error: oauthError } = req.query;

  if (oauthError) {
    console.error("OAuth error:", oauthError);
    return res.redirect("/integrations?error=oauth_failed");
  }

  if (!code || typeof code !== "string") {
    return res.redirect("/integrations?error=no_code");
  }

  try {
    // Get credentials
    const credentials = await getGoogleCredentials();
    
    if (!credentials) {
      console.error("No Google Calendar credentials available");
      return res.redirect("/integrations?error=no_credentials");
    }

    const redirectUri = getRedirectUri(req);

    console.log("🔄 Google OAuth Callback:", {
      code_received: "✅",
      client_id: credentials.clientId ? "✅" : "❌",
      client_secret: credentials.clientSecret ? "✅" : "❌",
      redirect_uri: redirectUri,
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
      const errorData = await tokenResponse.text();
      console.error("Token exchange failed:", {
        status: tokenResponse.status,
        error: errorData,
      });
      return res.redirect("/integrations?error=token_exchange_failed");
    }

    const tokens = await tokenResponse.json();

    console.log("✅ Tokens received:", {
      access_token: tokens.access_token ? "✅" : "❌",
      refresh_token: tokens.refresh_token ? "✅" : "❌",
      expires_in: tokens.expires_in,
    });

    // Get user session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // If no session on server side, we can try to pass tokens to client
    // But for security, we should really have a session here.
    // If running in development with no cookie, this might fail.
    
    // NOTE: In Next.js API routes, Supabase auth might not persist if cookies aren't passed correctly.
    // For now, if no session, we'll try to use a service role if we had a user_id passed in state (advanced)
    // OR we just fail and tell user to login.
    
    if (!session?.user) {
        // Fallback: Check if we have a way to identify user, otherwise error
        console.error("No authenticated user found in callback");
        
        // Em ambiente de desenvolvimento ou se os cookies não passarem,
        // podemos ter problemas aqui.
        // Vamos tentar redirecionar para uma página que trata de guardar os tokens
        // ou simplesmente erro.
        return res.redirect("/login?error=not_authenticated_callback");
    }

    // Store tokens in database using user_integrations table
    const { error: upsertError } = await supabase
      .from("user_integrations")
      .upsert(
        {
          user_id: session.user.id,
          integration_type: "google_calendar",
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          is_active: true,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: "user_id,integration_type",
        }
      );

    if (upsertError) {
      console.error("Failed to store tokens:", upsertError);
      return res.redirect("/integrations?error=storage_failed");
    }

    console.log("✅ Google Calendar connected successfully for user:", session.user.id);

    // Redirect to integrations page with success
    res.redirect("/integrations?success=google_calendar_connected");
  } catch (error) {
    console.error("Error in Google Calendar callback:", error);
    res.redirect("/integrations?error=callback_failed");
  }
}