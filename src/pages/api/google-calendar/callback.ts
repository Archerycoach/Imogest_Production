import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { code, state: userId } = req.query;

    if (!code || !userId || typeof code !== "string" || typeof userId !== "string") {
      return res.redirect("/integrations?error=invalid_callback");
    }

    console.log("📨 Received OAuth callback for user:", userId);

    // Get Google OAuth credentials
    const { data: settings, error: settingsError } = await (supabaseAdmin as any)
      .from("integration_settings")
      .select("*")
      .eq("integration_name", "google_calendar")
      .single();

    if (settingsError || !settings?.google_client_id || !settings?.google_client_secret) {
      console.error("❌ Failed to get settings:", settingsError);
      return res.redirect("/integrations?error=config_missing");
    }

    const { google_client_id, google_client_secret, google_redirect_uri } = settings;

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: google_client_id,
        client_secret: google_client_secret,
        redirect_uri: google_redirect_uri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      console.error("❌ Token exchange failed:", await tokenResponse.text());
      return res.redirect("/integrations?error=token_exchange_failed");
    }

    const tokens = await tokenResponse.json();
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    console.log("✅ Tokens received, saving to database...");

    // Save or update user integration
    const { error: updateError } = await (supabaseAdmin as any)
      .from("user_integrations")
      .upsert({
        user_id: userId,
        integration_type: "google_calendar",
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: expiresAt.toISOString(),
        is_active: true,
      })
      .eq("user_id", userId);

    if (updateError) {
      console.error("❌ Failed to save tokens:", updateError);
      return res.redirect("/integrations?error=save_failed");
    }

    console.log("✅ Google Calendar connected successfully!");
    return res.redirect("/integrations?success=google_calendar_connected");

  } catch (error) {
    console.error("❌ Error in Google OAuth callback:");
    console.error(error);
    res.redirect("/integrations?error=callback_failed");
  }
}