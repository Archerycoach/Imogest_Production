import type { NextApiRequest, NextApiResponse } from "next";
import { google } from "googleapis";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Admin for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 1. Get authenticated user from session
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "") || req.cookies["sb-access-token"];
    
    if (!token) {
      return res.status(401).json({ error: "Not authenticated. Please login first." });
    }

    // Create Supabase client with user token
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({ error: "Invalid session. Please login again." });
    }

    // 2. Get Integration Settings (Client ID & Secret)
    // NOTE: integration_settings table uses 'integration_name'
    const { data: integration, error: intError } = await supabaseAdmin
      .from("integration_settings")
      .select("settings")
      .eq("integration_name", "gmail")
      .single();

    if (intError || !integration || !integration.settings.clientId || !integration.settings.clientSecret) {
      return res.status(500).json({ error: "Gmail integration not configured in Admin settings" });
    }

    const { clientId, clientSecret, redirectUri } = integration.settings;

    // 3. Setup OAuth2 Client
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // 4. Generate Auth URL with user_id in state parameter
    const scopes = [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile"
    ];

    // Pass user_id in state so callback knows who is connecting
    const state = Buffer.from(JSON.stringify({ user_id: user.id })).toString("base64");

    const url = oauth2Client.generateAuthUrl({
      access_type: "offline", // Essential for receiving refresh_token
      scope: scopes,
      prompt: "consent", // Force consent to ensure we get refresh_token
      include_granted_scopes: true,
      state: state // Pass user context
    });

    return res.status(200).json({ url });
  } catch (error: any) {
    console.error("Gmail Auth Error:", error);
    return res.status(500).json({ error: error.message });
  }
}