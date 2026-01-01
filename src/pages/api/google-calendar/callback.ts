import type { NextApiRequest, NextApiResponse } from "next";
import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    console.log("=== Google Calendar OAuth Callback Started ===");
    const { code, state, error, error_description } = req.query;

    if (error) {
      console.error("OAuth error:", error, error_description);
      return res.redirect(`/admin/integrations?google_calendar=error&reason=${error}`);
    }

    if (!code || typeof code !== "string") {
      console.error("No authorization code provided");
      return res.redirect("/admin/integrations?google_calendar=error&reason=no_code");
    }

    // Recover user_id from state
    let userId: string | null = null;
    if (state && typeof state === "string") {
      try {
        const stateData = JSON.parse(Buffer.from(state, "base64").toString());
        userId = stateData.user_id;
        console.log("Recovered user_id from state:", userId);
      } catch (e) {
        console.error("Failed to parse state:", e);
      }
    }

    if (!userId) {
      console.error("❌ No user_id in OAuth state");
      return res.redirect("/admin/integrations?google_calendar=error&reason=no_user");
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error("Missing Google OAuth credentials");
      return res.redirect("/admin/integrations?google_calendar=error&reason=missing_credentials");
    }

    const host = req.headers.host || "localhost:3000";
    const isLocalhost = host.includes("localhost") || host.includes("127.0.0.1");
    const protocol = isLocalhost ? "http" : "https";
    const redirectUri = `${protocol}://${host}/api/google-calendar/callback`;

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    console.log("Exchanging code for tokens...");
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.access_token) {
      console.error("No access token received");
      return res.redirect("/admin/integrations?google_calendar=error&reason=no_token");
    }

    console.log("✅ Tokens received:", {
      has_access: !!tokens.access_token,
      has_refresh: !!tokens.refresh_token,
      expiry: tokens.expiry_date,
    });

    const expiresAt = tokens.expiry_date 
      ? new Date(tokens.expiry_date).toISOString()
      : new Date(Date.now() + 3600 * 1000).toISOString();

    // Use service role key to ensure INSERT succeeds
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      console.error("❌ SUPABASE_SERVICE_ROLE_KEY not configured");
      return res.redirect("/admin/integrations?google_calendar=error&reason=config_error");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    console.log("Saving credentials for user:", userId);

    // Check if integration exists
    const { data: existing } = await supabaseAdmin
      .from("user_integrations")
      .select("id")
      .eq("user_id", userId)
      .eq("integration_type", "google_calendar")
      .maybeSingle();

    if (existing) {
      console.log("Updating existing integration:", existing.id);
      const { error: updateError } = await supabaseAdmin
        .from("user_integrations")
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || null,
          token_expiry: expiresAt,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (updateError) {
        console.error("❌ Update failed:", updateError);
        return res.redirect("/admin/integrations?google_calendar=error&reason=db_error");
      }
      console.log("✅ Integration updated");
    } else {
      console.log("Creating new integration");
      const { error: insertError } = await supabaseAdmin
        .from("user_integrations")
        .insert({
          user_id: userId,
          integration_type: "google_calendar",
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || null,
          token_expiry: expiresAt,
          is_active: true,
        });

      if (insertError) {
        console.error("❌ Insert failed:", insertError);
        return res.redirect("/admin/integrations?google_calendar=error&reason=db_error");
      }
      console.log("✅ Integration created");
    }

    // Verify save
    const { data: verification } = await supabaseAdmin
      .from("user_integrations")
      .select("id, is_active")
      .eq("user_id", userId)
      .eq("integration_type", "google_calendar")
      .maybeSingle();

    if (!verification) {
      console.error("❌ CRITICAL: Data not found after save!");
      return res.redirect("/admin/integrations?google_calendar=error&reason=verification_failed");
    }

    console.log("✅ Verification passed:", verification);

    // Register webhook
    try {
      const { registerGoogleCalendarWebhook } = await import("@/services/googleCalendarWebhookService");
      await registerGoogleCalendarWebhook(tokens.access_token, userId);
      console.log("✅ Webhook registered");
    } catch (webhookError: any) {
      console.error("⚠️ Webhook registration failed:", webhookError.message);
    }

    console.log("=== OAuth Callback Completed Successfully ===");
    
    // CRITICAL: Preserve user session by setting SameSite=Lax for cross-origin redirect
    res.setHeader("Set-Cookie", [
      `oauth_success=true; Path=/; HttpOnly; SameSite=Lax; Max-Age=60`,
    ]);
    
    res.redirect("/admin/integrations?google_calendar=success&t=" + Date.now());
  } catch (error: any) {
    console.error("=== OAuth Callback Error ===", error);
    return res.redirect("/admin/integrations?google_calendar=error&reason=unknown");
  }
}