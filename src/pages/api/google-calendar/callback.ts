import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { code, state: userId } = req.query;

    if (!code || !userId || typeof userId !== "string") {
      return res.redirect(302, "/calendar?error=invalid_params");
    }

    // Get OAuth settings from database
    const { data: integrationSettings, error: settingsError } = await supabaseAdmin
      .from("integration_settings" as any)
      .select("*")
      .eq("service_name", "google_calendar")
      .single();

    if (settingsError || !integrationSettings) {
      console.error("Failed to get integration settings:", settingsError);
      return res.redirect(302, "/calendar?error=config_not_found");
    }

    const settings = integrationSettings as any;
    const { client_id, client_secret } = settings;

    if (!client_id || !client_secret) {
      console.error("Missing OAuth credentials in database");
      return res.redirect(302, "/calendar?error=missing_credentials");
    }

    // Exchange code for tokens
    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/google-calendar/callback`;
    
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code: code as string,
        client_id: client_id,
        client_secret: client_secret,
        redirect_uri: redirectUrl,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error("Token exchange failed:", error);
      return res.redirect(302, "/calendar?error=token_exchange");
    }

    const tokens = await tokenResponse.json();

    // Get user info
    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      return res.redirect(302, "/calendar?error=user_info");
    }

    const userInfo = await userInfoResponse.json();
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Save or update integration in database
    const { error: upsertError } = await supabaseAdmin
      .from("google_calendar_integrations" as any)
      .upsert({
        user_id: userId,
        google_email: userInfo.email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt.toISOString(),
        sync_events: true,
        sync_tasks: true,
        sync_notes: false,
        sync_direction: "both",
        auto_sync: true,
      }, {
        onConflict: "user_id",
      });

    if (upsertError) {
      console.error("Error saving integration:", upsertError);
      return res.redirect(302, "/calendar?error=save_failed");
    }

    // Redirect to calendar with success flag to trigger sync
    res.redirect(302, "/calendar?google_connected=true&auto_sync=true");
  } catch (error) {
    console.error("Error in Google Calendar callback:", error);
    res.redirect(302, "/calendar?error=true");
  }
}