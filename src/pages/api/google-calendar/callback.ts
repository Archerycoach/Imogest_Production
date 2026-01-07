import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import axios from "axios";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { code, state: userId, error } = req.query;

    if (error) {
      console.error("OAuth error:", error);
      return res.redirect("/integrations?error=oauth_error");
    }

    if (!code || typeof code !== "string") {
      console.error("No authorization code received");
      return res.redirect("/integrations?error=no_code");
    }

    if (!userId || typeof userId !== "string") {
      console.error("No user ID in state");
      return res.redirect("/integrations?error=no_user");
    }

    console.log("📨 Received OAuth callback for user:", userId);

    // Get Google OAuth credentials
    const { data: settings, error: settingsError } = await (supabaseAdmin as any)
      .from("integration_settings")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (settingsError || !settings?.google_client_id || !settings?.google_client_secret) {
      console.error("Failed to get OAuth credentials:", settingsError);
      return res.redirect("/integrations?error=missing_credentials");
    }

    // Exchange code for tokens
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/google-calendar/callback`;

    const tokenResponse = await axios.post("https://oauth2.googleapis.com/token", {
      code,
      client_id: settings.google_client_id,
      client_secret: settings.google_client_secret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    if (!access_token || !refresh_token) {
      console.error("Failed to get tokens from Google");
      return res.redirect("/integrations?error=token_exchange_failed");
    }

    console.log("🎉 Successfully obtained tokens");

    // Calculate token expiry
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    // Store tokens in database
    const { error: updateError } = await (supabaseAdmin as any)
      .from("integration_settings")
      .update({
        google_calendar_access_token: access_token,
        google_calendar_refresh_token: refresh_token,
        google_calendar_token_expiry: expiresAt,
        google_calendar_connected: true,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (updateError) {
      console.error("Failed to store tokens:", updateError);
      return res.redirect("/integrations?error=store_tokens_failed");
    }

    console.log("✅ Google Calendar connected successfully");

    // Redirect back to integrations page with success
    return res.redirect("/integrations?success=google_calendar_connected");
  } catch (error) {
    console.error("Error in Google Calendar callback:");
    console.error(error);
    res.redirect("/integrations?error=callback_failed");
  }
}