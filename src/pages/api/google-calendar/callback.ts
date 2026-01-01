import type { NextApiRequest, NextApiResponse } from "next";
import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";
import { storeGoogleCredentials } from "@/services/googleCalendarService";
import { registerGoogleCalendarWebhook } from "@/services/googleCalendarWebhookService";

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

    // Get user from Supabase using cookies (server-side API route method)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    // Create Supabase client that can read cookies
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      },
    });

    // Try to get user from auth cookie
    const authHeader = req.headers.cookie || "";
    const accessToken = extractAccessTokenFromCookie(authHeader);
    
    if (!accessToken) {
      console.error("No access token in cookies");
      return res.redirect("/login?redirect=/admin/integrations&google_calendar=error&reason=not_authenticated");
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      console.error("Failed to get user:", authError);
      return res.redirect("/login?redirect=/admin/integrations&google_calendar=error&reason=not_authenticated");
    }

    // Calculate expiration date from expiry_date (timestamp in milliseconds)
    const expiresAt = tokens.expiry_date 
      ? new Date(tokens.expiry_date).toISOString()
      : new Date(Date.now() + 3600 * 1000).toISOString(); // Default to 1 hour if not provided

    // Store credentials
    await storeGoogleCredentials(
      tokens.access_token,
      tokens.refresh_token || null,
      expiresAt
    );

    // Register webhook for push notifications
    try {
      console.log("Registering Google Calendar webhook...");
      await registerGoogleCalendarWebhook(tokens.access_token, user.id);
      console.log("Webhook registered successfully");
    } catch (webhookError) {
      console.error("Failed to register webhook:", webhookError);
      // Continue anyway, we can try again later or use polling
    }

    // Redirect back to integrations page with success
    res.redirect("/admin/integrations?google_calendar=success");
  } catch (error) {
    console.error("Error in Google Calendar callback:", error);
    return res.redirect("/admin/integrations?google_calendar=error&reason=unknown");
  }
}

/**
 * Extract Supabase access token from cookies
 * Supabase stores the session in cookies with a specific format
 */
function extractAccessTokenFromCookie(cookieHeader: string): string | null {
  try {
    // Parse cookies
    const cookies = cookieHeader.split(";").reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split("=");
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    // Look for Supabase auth token
    // The cookie name format is: sb-{project-ref}-auth-token
    const authCookieKey = Object.keys(cookies).find(key => 
      key.startsWith("sb-") && key.endsWith("-auth-token")
    );

    if (!authCookieKey) {
      return null;
    }

    // Decode the cookie value (it's URL encoded JSON)
    const authData = JSON.parse(decodeURIComponent(cookies[authCookieKey]));
    return authData.access_token || null;
  } catch (error) {
    console.error("Error extracting access token from cookie:", error);
    return null;
  }
}