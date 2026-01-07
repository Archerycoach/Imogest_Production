import type { NextApiRequest, NextApiResponse } from "next";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Get credentials from database
const getGoogleCredentials = async () => {
  const { data, error } = await supabaseAdmin
    .from("integration_settings")
    .select("settings")
    .eq("integration_name", "google_calendar")
    .single();

  if (error || !data) {
    console.error("❌ Failed to fetch Google Calendar settings from database:", error);
    return null;
  }

  const settings = data.settings as any;
  
  if (!settings?.clientId || !settings?.clientSecret) {
    console.error("❌ Incomplete Google Calendar credentials in database");
    return null;
  }

  console.log("✅ Google Calendar credentials loaded from database");
  return {
    clientId: settings.clientId,
    clientSecret: settings.clientSecret,
    redirectUri: settings.redirectUri,
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log("\n🚀 Initiating Google OAuth flow");

  try {
    // Create Supabase client with SSR support for API routes
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies[name];
          },
          set(name: string, value: string, options: CookieOptions) {
            res.setHeader("Set-Cookie", `${name}=${value}; Path=/; ${options.maxAge ? `Max-Age=${options.maxAge};` : ""} HttpOnly; SameSite=Lax`);
          },
          remove(name: string, options: CookieOptions) {
            res.setHeader("Set-Cookie", `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`);
          },
        },
      }
    );

    // Get user from session
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("❌ Failed to get user from session:", userError);
      return res.status(401).json({ error: "Not authenticated. Please log in first." });
    }

    console.log("👤 User authenticated:", user.id);

    // Get credentials from database
    const credentials = await getGoogleCredentials();
    
    if (!credentials) {
      console.error("❌ Google Calendar não está configurado");
      return res.status(400).json({ 
        error: "Google Calendar não está configurado. Por favor configure as credenciais em /admin/integrations" 
      });
    }

    // Generate redirectUri from request host if not in database
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers.host;
    const origin = req.headers.origin;
    
    const fallbackRedirectUri = origin 
      ? `${origin}/api/google-calendar/callback`
      : `${protocol}://${host}/api/google-calendar/callback`;

    const redirectUri = credentials.redirectUri || fallbackRedirectUri;

    console.log("✅ Credentials loaded successfully");
    console.log("🔗 Using redirect URI:", redirectUri);

    // Create state parameter with user ID (for security and user context)
    const state = Buffer.from(JSON.stringify({
      userId: user.id,
      timestamp: Date.now()
    })).toString("base64");

    // Build authorization URL with state
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.append("client_id", credentials.clientId);
    authUrl.searchParams.append("redirect_uri", redirectUri);
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append("scope", "https://www.googleapis.com/auth/calendar");
    authUrl.searchParams.append("access_type", "offline");
    authUrl.searchParams.append("prompt", "consent");
    authUrl.searchParams.append("state", state);

    console.log("✅ Authorization URL built successfully");
    console.log("📍 Redirecting to Google OAuth...");

    res.json({ url: authUrl.toString() });
  } catch (error) {
    console.error("\n❌ Error in Google OAuth init:", error);
    res.status(500).json({ error: "Failed to initiate Google OAuth flow" });
  }
}