import type { NextApiRequest, NextApiResponse } from "next";
import { google } from "googleapis";
import { supabase } from "@/integrations/supabase/client";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { code } = req.query;

    if (!code || typeof code !== "string") {
      return res.redirect("/admin/integrations?google_calendar=error&reason=no_code");
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.redirect("/admin/integrations?google_calendar=error&reason=missing_credentials");
    }

    // Dynamic redirect URI detection (must match auth.ts)
    const host = req.headers.host || "localhost:3000";
    const isLocalhost = host.includes("localhost") || host.includes("127.0.0.1");
    
    // Use http:// for localhost, https:// for everything else
    const protocol = isLocalhost ? "http" : "https";
    const redirectUri = `${protocol}://${host}/api/google-calendar/callback`;

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.access_token) {
      return res.redirect("/admin/integrations?google_calendar=error&reason=no_token");
    }

    // Get user from Supabase session
    // Note: In API routes, we need to use the cookie-based auth
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "");
    
    // Get user from Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      // If no session, redirect to login with return URL
      return res.redirect("/login?redirect=/admin/integrations&google_calendar=error&reason=not_authenticated");
    }

    // Save tokens to database
    const { error: dbError } = await supabase
      .from("user_integrations")
      .upsert({
        user_id: user.id,
        integration_type: "google_calendar",
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        is_active: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: "user_id,integration_type"
      });

    if (dbError) {
      console.error("Error saving tokens:", dbError);
      return res.redirect("/admin/integrations?google_calendar=error&reason=db_error");
    }

    return res.redirect("/admin/integrations?google_calendar=success");
  } catch (error) {
    console.error("Error in Google Calendar callback:", error);
    return res.redirect("/admin/integrations?google_calendar=error&reason=unknown");
  }
}