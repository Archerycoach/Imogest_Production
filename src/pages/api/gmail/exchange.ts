import type { NextApiRequest, NextApiResponse } from "next";
import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { code } = req.body;

  // Validate User Session
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Missing authorization header" });
  }
  
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    return res.status(401).json({ error: "Unauthorized" });
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
    
    // 3. Store Credentials securely in user_integrations
    const { error: storeError } = await supabaseAdmin
      .from("user_integrations")
      .upsert({
        user_id: user.id,
        integration_type: "gmail",
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token, // Critical for offline access
        token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        is_active: true,
        metadata: {
            scope: tokens.scope,
            token_type: tokens.token_type
        },
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,integration_type' });

    if (storeError) throw storeError;

    return res.status(200).json({ success: true });

  } catch (error: any) {
    console.error("Gmail Exchange Error:", error);
    return res.status(500).json({ error: error.message });
  }
}