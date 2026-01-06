import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("🔐 Starting Google Calendar OAuth flow...");

    // HYBRID AUTH: Extract token from Authorization header if present
    const authHeader = req.headers.authorization;
    const authToken = authHeader?.replace("Bearer ", "");

    // Initialize Supabase client with proper auth configuration
    const supabaseOptions: any = {
      auth: { persistSession: false }
    };

    // If we have an auth token, include it in the headers
    if (authToken) {
      console.log("🔑 Using Authorization header token");
      supabaseOptions.global = {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      };
    } else {
      console.log("🍪 Using cookie-based session");
      supabaseOptions.global = {
        headers: {
          cookie: req.headers.cookie || ""
        }
      };
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      supabaseOptions
    );

    // Get user from session (uses token from headers if provided)
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (!user || userError) {
      console.error("❌ Authentication failed:", userError?.message);
      return res.status(401).json({ 
        error: "Not authenticated. Please log in first." 
      });
    }

    console.log("✅ User authenticated:", user.id);

    // Check for required environment variables
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      console.error("❌ Missing required environment variables");
      return res.status(500).json({ 
        error: "Google Calendar integration not configured" 
      });
    }

    console.log("✅ Environment variables found");
    console.log("📍 Redirect URI:", redirectUri);

    // Build OAuth URL
    const scopes = [
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/calendar.events",
    ].join(" ");

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.append("client_id", clientId);
    authUrl.searchParams.append("redirect_uri", redirectUri);
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append("scope", scopes);
    authUrl.searchParams.append("access_type", "offline");
    authUrl.searchParams.append("prompt", "consent");
    authUrl.searchParams.append("state", user.id);

    console.log("🔗 Redirecting to Google OAuth:", authUrl.toString());

    // Redirect to Google OAuth
    res.redirect(authUrl.toString());
  } catch (error: any) {
    console.error("❌ Google Calendar auth error:", error);
    return res.status(500).json({ 
      error: "Failed to initiate Google Calendar authentication",
      details: error.message 
    });
  }
}