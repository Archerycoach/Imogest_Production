import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Get credentials from database
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
  
  if (!settings?.clientId || !settings?.clientSecret) {
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
  console.log("\n🔔 Google Calendar Callback Started");
  console.log("📍 Full URL:", req.url);
  console.log("🔑 Query params:", req.query);

  const { code, state, error: oauthError } = req.query;

  if (oauthError) {
    console.error("❌ OAuth error from Google:", oauthError);
    return res.redirect("/integrations?error=oauth_failed");
  }

  if (!code || typeof code !== "string") {
    console.error("❌ No authorization code received");
    return res.redirect("/integrations?error=no_code");
  }

  if (!state || typeof state !== "string") {
    console.error("❌ No state parameter received");
    return res.redirect("/integrations?error=no_state");
  }

  console.log("✅ Authorization code received (length:", code.length, ")");

  try {
    // Decode state to get user ID
    const stateData = JSON.parse(Buffer.from(state, "base64").toString());
    const userId = stateData.userId;

    if (!userId) {
      console.error("❌ No user ID in state parameter");
      return res.redirect("/integrations?error=invalid_state");
    }

    console.log("👤 User ID from state:", userId);

    // Get credentials from database
    const credentials = await getGoogleCredentials();
    
    if (!credentials) {
      console.error("❌ No Google Calendar credentials available");
      return res.redirect("/integrations?error=no_credentials");
    }

    // Generate redirectUri if not in database
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers.host;
    const origin = req.headers.origin;
    
    const fallbackRedirectUri = origin 
      ? `${origin}/api/google-calendar/callback`
      : `${protocol}://${host}/api/google-calendar/callback`;

    const redirectUri = credentials.redirectUri || fallbackRedirectUri;

    console.log("\n🔄 Attempting token exchange with Google:");
    console.log("  - Client ID:", credentials.clientId.substring(0, 20) + "...");
    console.log("  - Client Secret:", credentials.clientSecret ? "✅ Present" : "❌ Missing");
    console.log("  - Redirect URI:", redirectUri);
    console.log("  - Code length:", code.length);

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

    console.log("📡 Token response status:", tokenResponse.status, tokenResponse.statusText);

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("\n❌ Token exchange failed:");
      console.error("  - Status:", tokenResponse.status);
      console.error("  - Response:", errorData);
      
      try {
        const errorJson = JSON.parse(errorData);
        console.error("  - Error details:", JSON.stringify(errorJson, null, 2));
      } catch {
        // Error data is not JSON
      }

      return res.redirect(`/integrations?error=token_exchange_failed&details=${encodeURIComponent(errorData.substring(0, 100))}`);
    }

    const tokens = await tokenResponse.json();

    console.log("\n✅ Tokens received successfully:");
    console.log("  - Access token:", tokens.access_token ? "✅ Present" : "❌ Missing");
    console.log("  - Refresh token:", tokens.refresh_token ? "✅ Present" : "❌ Missing");
    console.log("  - Expires in:", tokens.expires_in, "seconds");

    // Store tokens in database using user_integrations table
    const tokenData = {
      user_id: userId,
      integration_type: "google_calendar",
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      is_active: true,
      updated_at: new Date().toISOString()
    };

    console.log("\n💾 Storing tokens in database for user:", userId);

    const { error: upsertError } = await supabaseAdmin
      .from("user_integrations")
      .upsert(tokenData, {
        onConflict: "user_id,integration_type",
      });

    if (upsertError) {
      console.error("❌ Failed to store tokens:", upsertError);
      return res.redirect("/integrations?error=storage_failed");
    }

    console.log("✅ Tokens stored successfully");
    console.log("🎉 Google Calendar connected successfully for user:", userId);

    // Redirect to calendar page with success
    res.redirect("/calendar?success=google_calendar_connected");
  } catch (error) {
    console.error("\n❌ Unexpected error in Google Calendar callback:");
    console.error(error);
    res.redirect("/integrations?error=callback_failed");
  }
}