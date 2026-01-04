import type { NextApiRequest, NextApiResponse } from "next";
import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;

  if (!code || typeof code !== "string") {
    return res.status(400).json({ error: "Missing authorization code" });
  }

  try {
    // 1. Get Integration Settings
    const { data: integration, error: intError } = await supabaseAdmin
      .from("integration_settings")
      .select("settings")
      .eq("integration_name", "gmail")
      .single();

    if (intError || !integration) {
      throw new Error("Gmail integration configuration not found");
    }

    const { clientId, clientSecret, redirectUri } = integration.settings;

    // 2. Exchange Code for Tokens
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // 3. Get User Profile (to identify who connected)
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data: userProfile } = await oauth2.userinfo.get();

    // 4. Identify the Imogest User (Using session logic or passed state, 
    //    but typically callback happens in browser where session cookie exists.
    //    Here we are in API route. We need to know WHICH user to link.
    //    Standard OAuth pattern: 'state' param carries user ID or we rely on client-side session.
    //    However, simpler approach: Redirect to frontend with tokens? No, unsafe.
    //    Best approach: This callback should handle the exchange and store it.
    //    BUT we don't know the Supabase User ID here without the session cookie available to the API.
    //    Next.js API routes receive cookies. Let's try to get the user from Supabase auth cookie.
    
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    );
    
    // Attempt to get user from session (cookies)
    // Note: This relies on how Supabase auth cookies are set. 
    // If running on different domain/port, might be tricky.
    // Assuming standard Next.js setup where cookies are passed.
    
    // ALTERNATIVE: Redirect back to a frontend page with the 'code', and let frontend call an API 
    // to exchange code (passing bearer token).
    // This file is the Redirect URI registered in Google. 
    // It must do the exchange OR redirect to frontend.
    // Let's redirect to a frontend page that completes the process.
    
    res.redirect(`/settings?gmail_code=${code}`);
    return;

  } catch (error: any) {
    console.error("Gmail Callback Error:", error);
    res.redirect(`/settings?error=${encodeURIComponent(error.message)}`);
  }
}