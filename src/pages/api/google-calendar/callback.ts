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
      return res.redirect(302, "/admin/integrations?error=invalid_params");
    }

    // Get OAuth settings from database
    const { data: settingsRecord, error: settingsError } = await supabaseAdmin
      .from("integration_settings")
      .select("*")
      .eq("integration_name", "google_calendar")
      .single();

    if (settingsError || !settingsRecord) {
      console.error("OAuth settings not configured:", settingsError);
      return res.redirect(302, "/admin/integrations?error=not_configured");
    }

    const settings = settingsRecord.settings as any;

    if (!settings?.client_id || !settings?.client_secret) {
      console.error("OAuth credentials missing in settings");
      return res.redirect(302, "/admin/integrations?error=not_configured");
    }

    if (!settingsRecord.is_active) {
      return res.redirect(302, "/admin/integrations?error=disabled");
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
        client_id: settings.client_id,
        client_secret: settings.client_secret,
        redirect_uri: redirectUrl,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error("Token exchange failed:", error);
      return res.redirect(302, "/admin/integrations?error=token_exchange");
    }

    const tokens = await tokenResponse.json();

    // Get user info
    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      return res.redirect(302, "/admin/integrations?error=user_info");
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
      return res.redirect(302, "/admin/integrations?error=save_failed");
    }

    res.redirect(302, "/admin/integrations?success=true");
  } catch (error) {
    console.error("Error in Google Calendar callback:", error);
    res.redirect(302, "/admin/integrations?error=true");
  }
}