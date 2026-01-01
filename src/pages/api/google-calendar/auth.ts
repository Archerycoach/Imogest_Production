import type { NextApiRequest, NextApiResponse } from "next";
import { google } from "googleapis";
import { supabase } from "@/integrations/supabase/client";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Get authenticated user
    const authHeader = req.headers.cookie || "";
    const accessToken = extractAccessTokenFromCookie(authHeader);
    
    if (!accessToken) {
      console.error("No access token found in cookies");
      return res.redirect("/login?redirect=/admin/integrations&error=not_authenticated");
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (userError || !user) {
      console.error("Failed to get user:", userError?.message);
      return res.redirect("/login?redirect=/admin/integrations&error=not_authenticated");
    }

    console.log("User authenticated for OAuth:", user.id);

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error("Missing Google OAuth credentials");
      return res.redirect("/admin/integrations?google_calendar=error&reason=missing_credentials");
    }

    // Dynamic redirect URI
    const host = req.headers.host || "localhost:3000";
    const isLocalhost = host.includes("localhost") || host.includes("127.0.0.1");
    const protocol = isLocalhost ? "http" : "https";
    const redirectUri = `${protocol}://${host}/api/google-calendar/callback`;

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    const scopes = [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
    ];

    // Include user_id in state for callback recovery
    const state = Buffer.from(JSON.stringify({ user_id: user.id })).toString("base64");

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      prompt: "consent",
      state, // Pass user_id in state
    });

    console.log("Redirecting to Google OAuth with user_id in state");
    res.redirect(authUrl);
  } catch (error: any) {
    console.error("Error in Google Calendar auth:", error);
    res.redirect("/admin/integrations?google_calendar=error&reason=unknown");
  }
}

function extractAccessTokenFromCookie(cookieHeader: string): string | null {
  try {
    if (!cookieHeader) return null;

    const cookies = cookieHeader.split(";").reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split("=");
      if (key && value) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, string>);

    const authCookieKey = Object.keys(cookies).find(key => 
      key.startsWith("sb-") && key.endsWith("-auth-token")
    );

    if (!authCookieKey) return null;

    const authData = JSON.parse(decodeURIComponent(cookies[authCookieKey]));
    return authData.access_token || null;
  } catch (error) {
    return null;
  }
}
