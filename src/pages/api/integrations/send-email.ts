import type { NextApiRequest, NextApiResponse } from "next";
import nodemailer from "nodemailer";
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

  const { to, subject, html, userId } = req.body;

  if (!to || !subject || !html) {
    return res.status(400).json({ error: "Missing required fields: to, subject, html" });
  }

  try {
    console.log("📧 [send-email] Starting email send process");

    // 1. Identify User (from session or provided userId)
    let targetUserId = userId;

    if (!targetUserId) {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "Missing authorization header" });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

      if (authError || !user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      targetUserId = user.id;
    }

    console.log(`🔍 [send-email] Target user ID: ${targetUserId}`);

    // 2. Fetch User's Gmail Credentials from user_integrations
    console.log(`🔍 [send-email] Fetching Gmail credentials for user ${targetUserId}`);
    
    const { data: userGmail, error: gmailError } = await supabaseAdmin
      .from("user_integrations")
      .select("access_token, refresh_token, token_expiry, is_active")
      .eq("user_id", targetUserId)
      .eq("integration_type", "gmail")
      .single();

    if (gmailError || !userGmail || !userGmail.is_active) {
      console.error("❌ [send-email] User Gmail not connected");
      return res.status(400).json({
        success: false,
        error: "Gmail account not connected. Please connect your Gmail account in Settings.",
      });
    }

    console.log("✅ [send-email] Gmail credentials retrieved");

    // 3. Fetch App Configuration (Client ID & Secret)
    const { data: appConfig, error: appError } = await supabaseAdmin
      .from("integration_settings")
      .select("settings, is_active")
      .eq("integration_name", "gmail")
      .single();

    if (appError || !appConfig || !appConfig.is_active) {
      console.error("❌ [send-email] Gmail integration not configured");
      return res.status(500).json({
        success: false,
        error: "Gmail integration not properly configured",
      });
    }

    const { clientId, clientSecret } = appConfig.settings;
    const { access_token, refresh_token, token_expiry } = userGmail;

    // 4. Fetch User Profile (for from email)
    const { data: userProfile } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name")
      .eq("id", targetUserId)
      .single();

    const userEmail = userProfile?.email || to;
    const userName = userProfile?.full_name || "Imogest User";

    // 5. Check if token needs refresh (simple check, nodemailer handles refresh usually if configured right)
    const isTokenExpired = token_expiry && new Date(token_expiry) <= new Date();
    
    if (isTokenExpired) {
      console.log("🔵 [send-email] Access token expired, Nodemailer will refresh automatically");
    }

    // 6. Create Transporter with OAuth2
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        type: "OAuth2",
        user: userEmail,
        clientId,
        clientSecret,
        refreshToken: refresh_token,
        accessToken: access_token,
        expires: token_expiry ? new Date(token_expiry).getTime() : undefined,
      },
    } as any);

    console.log(`📧 [send-email] Sending email as ${userEmail}`);

    // 7. Send Email
    const info = await transporter.sendMail({
      from: `${userName} <${userEmail}>`,
      to,
      subject,
      html,
    });

    console.log(`✅ [send-email] Email sent successfully`);
    console.log(`📧 [send-email] Message ID: ${info.messageId}`);

    return res.status(200).json({
      success: true,
      messageId: info.messageId,
    });

  } catch (error: any) {
    console.error("❌ [send-email] Error sending email:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to send email",
    });
  }
}