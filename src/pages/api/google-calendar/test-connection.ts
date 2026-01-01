import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    console.log("=== TEST CONNECTION ===");
    
    // Try to get user from cookie (server-side method)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    const supabaseServer = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      },
    });

    const authHeader = req.headers.cookie || "";
    const accessToken = extractAccessTokenFromCookie(authHeader);
    
    if (!accessToken) {
      return res.status(401).json({ 
        error: "Not authenticated",
        details: "No access token found in cookies",
        hasCookie: !!authHeader,
      });
    }

    const { data: { user }, error: authError } = await supabaseServer.auth.getUser(accessToken);

    if (authError || !user) {
      return res.status(401).json({ 
        error: "Authentication failed",
        details: authError?.message || "User is null",
      });
    }

    console.log("User authenticated:", user.id);

    // Check if Google Calendar is connected
    const { data: integration, error: integrationError } = await supabaseServer
      .from("user_integrations")
      .select("*")
      .eq("user_id", user.id)
      .eq("integration_type", "google_calendar")
      .maybeSingle();

    if (integrationError) {
      return res.status(500).json({
        error: "Database query failed",
        details: integrationError.message,
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
      },
      googleCalendar: integration ? {
        connected: integration.is_active,
        hasAccessToken: !!integration.access_token,
        hasRefreshToken: !!integration.refresh_token,
        tokenExpiry: integration.token_expiry,
        webhookChannelId: integration.webhook_channel_id,
        webhookExpiration: integration.webhook_expiration,
      } : {
        connected: false,
        message: "No integration found",
      },
    });
  } catch (error: any) {
    console.error("Test connection error:", error);
    return res.status(500).json({ 
      error: "Internal server error",
      details: error.message,
    });
  }
}

function extractAccessTokenFromCookie(cookieHeader: string): string | null {
  try {
    const cookies = cookieHeader.split(";").reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split("=");
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    const authCookieKey = Object.keys(cookies).find(key => 
      key.startsWith("sb-") && key.endsWith("-auth-token")
    );

    if (!authCookieKey) {
      return null;
    }

    const authData = JSON.parse(decodeURIComponent(cookies[authCookieKey]));
    return authData.access_token || null;
  } catch (error) {
    console.error("Error extracting access token from cookie:", error);
    return null;
  }
}