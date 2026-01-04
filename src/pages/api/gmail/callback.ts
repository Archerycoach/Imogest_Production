import type { NextApiRequest, NextApiResponse } from "next";
import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Admin for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, state } = req.query;

  if (!code || typeof code !== "string") {
    return res.redirect("/integrations?error=missing_code");
  }

  try {
    // 1. Get user_id from state parameter (preferred) or session cookie (fallback)
    let userId: string | null = null;

    // Try to get user_id from state parameter first
    if (state && typeof state === "string") {
      try {
        // Decode base64 state which should be JSON string
        const decodedString = Buffer.from(state, "base64").toString();
        const decoded = JSON.parse(decodedString);
        userId = decoded.user_id;
      } catch (e) {
        console.error("Failed to decode state parameter:", e);
      }
    }

    // Fallback: try to get user from session cookie
    if (!userId) {
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace("Bearer ", "") || req.cookies["sb-access-token"];
      
      if (token) {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        if (user && !userError) {
          userId = user.id;
        }
      }
    }

    if (!userId) {
      return res.redirect("/integrations?error=not_authenticated");
    }

    // 2. Get Integration Settings (Client ID & Secret from admin config)
    // NOTE: integration_settings table uses 'integration_name'
    const { data: integration, error: intError } = await supabaseAdmin
      .from("integration_settings")
      .select("settings")
      .eq("integration_name", "gmail")
      .single();

    if (intError || !integration) {
      console.error("Gmail integration not found:", intError);
      return res.redirect("/integrations?error=integration_not_configured");
    }

    const { clientId, clientSecret, redirectUri } = integration.settings;

    if (!clientId || !clientSecret) {
      return res.redirect("/integrations?error=missing_credentials");
    }

    // 3. Exchange authorization code for tokens
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.access_token) {
      throw new Error("No access token received");
    }

    // 4. Get user profile from Google
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data: userProfile } = await oauth2.userinfo.get();

    // 5. Store tokens in user_integrations table
    // NOTE: user_integrations table uses 'integration_type'
    // NOTE: We store tokens in separate columns, not a json blob
    const { error: upsertError } = await supabaseAdmin
      .from("user_integrations")
      .upsert({
        user_id: userId,
        integration_type: "gmail", // Using integration_type as per schema
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        is_active: true,
        metadata: {
          email: userProfile.email,
          name: userProfile.name,
          picture: userProfile.picture,
          scope: tokens.scope
        },
        updated_at: new Date().toISOString()
      }, {
        onConflict: "user_id,integration_type"
      });

    if (upsertError) {
      console.error("Failed to store credentials:", upsertError);
      return res.redirect("/integrations?error=failed_to_save");
    }

    // 6. Success! Redirect back to integrations page
    return res.redirect("/integrations?gmail_connected=true");

  } catch (error: any) {
    console.error("Gmail OAuth Callback Error:", error);
    const errorMessage = encodeURIComponent(error.message || "Unknown error");
    return res.redirect(`/integrations?error=${errorMessage}`);
  }
}