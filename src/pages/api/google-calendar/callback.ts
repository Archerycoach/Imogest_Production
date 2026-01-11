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
    const { code, state: userId, error: oauthError } = req.query;

    console.log("[Google Calendar Callback] Request received:", {
      hasCode: !!code,
      hasUserId: !!userId,
      hasError: !!oauthError,
      error: oauthError
    });

    // Check if user denied authorization
    if (oauthError) {
      console.error("[Google Calendar Callback] OAuth error:", oauthError);
      return res.redirect(302, "/calendar?error=authorization_denied");
    }

    if (!code || !userId || typeof userId !== "string") {
      console.error("[Google Calendar Callback] Missing parameters:", { code: !!code, userId });
      return res.redirect(302, "/calendar?error=invalid_params");
    }

    // Get OAuth settings from database
    const { data: integrationSettings, error: settingsError } = await supabaseAdmin
      .from("integration_settings" as any)
      .select("*")
      .eq("service_name", "google_calendar")
      .single();

    if (settingsError || !integrationSettings) {
      console.error("[Google Calendar Callback] Failed to get integration settings:", settingsError);
      return res.redirect(302, "/calendar?error=config_not_found");
    }

    const settings = integrationSettings as any;
    const { client_id, client_secret, redirect_uri } = settings;

    if (!client_id || !client_secret) {
      console.error("[Google Calendar Callback] Missing OAuth credentials in database");
      return res.redirect(302, "/calendar?error=missing_credentials");
    }

    console.log("[Google Calendar Callback] Using redirect URI:", redirect_uri);

    // Exchange code for tokens
    const tokenRequestBody = {
      code: code as string,
      client_id: client_id,
      client_secret: client_secret,
      redirect_uri: redirect_uri || `${process.env.NEXT_PUBLIC_APP_URL || "https://www.imogest.pt"}/api/google-calendar/callback`,
      grant_type: "authorization_code",
    };

    console.log("[Google Calendar Callback] Token exchange request:", {
      redirect_uri: tokenRequestBody.redirect_uri,
      hasCode: !!tokenRequestBody.code,
      hasClientId: !!tokenRequestBody.client_id,
      hasClientSecret: !!tokenRequestBody.client_secret
    });
    
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(tokenRequestBody),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("[Google Calendar Callback] Token exchange failed:", {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: errorText
      });
      return res.redirect(302, `/calendar?error=token_exchange&details=${encodeURIComponent(errorText)}`);
    }

    const tokens = await tokenResponse.json();
    console.log("[Google Calendar Callback] Tokens received successfully");

    // Get user info
    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      const errorText = await userInfoResponse.text();
      console.error("[Google Calendar Callback] User info request failed:", {
        status: userInfoResponse.status,
        error: errorText
      });
      return res.redirect(302, "/calendar?error=user_info");
    }

    const userInfo = await userInfoResponse.json();
    console.log("[Google Calendar Callback] User info received:", { email: userInfo.email });

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
      console.error("[Google Calendar Callback] Error saving integration:", upsertError);
      return res.redirect(302, "/calendar?error=save_failed");
    }

    console.log("[Google Calendar Callback] Integration saved successfully");

    // Redirect to calendar with success flag to trigger sync
    res.redirect(302, "/calendar?connected=true&sync=true");
  } catch (error) {
    console.error("[Google Calendar Callback] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "unknown";
    res.redirect(302, `/calendar?error=true&details=${encodeURIComponent(errorMessage)}`);
  }
}