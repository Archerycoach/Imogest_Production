import type { NextApiRequest, NextApiResponse } from "next";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("🧪 [test-gmail-connection] Testing Gmail SMTP connection...");

    // Get Gmail SMTP configuration from database
    const { data: integration, error: integrationError } = await supabase
      .from("integration_settings")
      .select("settings, is_active")
      .eq("integration_name", "gmail")
      .single();

    if (integrationError || !integration) {
      console.error("❌ [test-gmail-connection] Integration not found:", integrationError);
      return res.status(500).json({
        success: false,
        message: "Gmail integration not configured. Please save your credentials first.",
      });
    }

    if (!integration.is_active) {
      return res.status(500).json({
        success: false,
        message: "Gmail integration is not active. Please enable it first.",
      });
    }

    const settings = integration.settings as any;

    if (!settings.smtp_user || !settings.smtp_pass) {
      return res.status(500).json({
        success: false,
        message: "Gmail SMTP credentials not configured. Please fill in all required fields.",
      });
    }

    // Create Transporter
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: settings.smtp_user,
        pass: settings.smtp_pass,
      },
    });

    // Test connection
    console.log("🔍 [test-gmail-connection] Verifying SMTP connection...");
    await transporter.verify();
    console.log("✅ [test-gmail-connection] SMTP connection successful");

    // Update test status in database
    await supabase
      .from("integration_settings")
      .update({
        test_status: "success",
        test_message: "Gmail SMTP connection successful",
        last_tested_at: new Date().toISOString(),
      })
      .eq("integration_name", "gmail");

    // Send test email if requested
    const { testEmail } = req.body;

    if (testEmail) {
      console.log("📧 [test-gmail-connection] Sending test email to:", testEmail);

      const info = await transporter.sendMail({
        from: {
          name: settings.from_name || "Imogest CRM",
          address: settings.from_email || settings.smtp_user,
        },
        to: testEmail,
        subject: "🧪 Teste Gmail SMTP - Imogest CRM",
        html: `
          <!DOCTYPE html>
          <html>
          <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h1 style="color: #4F46E5; margin-bottom: 20px;">✅ Gmail SMTP Configurado!</h1>
              <p style="font-size: 16px; line-height: 1.6; color: #333;">
                Este é um email de teste do sistema <strong>Imogest CRM</strong>.
              </p>
              <div style="background-color: #EEF2FF; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0; color: #4F46E5; font-weight: bold;">✅ Status:</p>
                <p style="margin: 5px 0 0 0; color: #333;">Configuração Gmail SMTP funcionando corretamente.</p>
              </div>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
              <p style="color: #6B7280; font-size: 12px; margin: 0;">
                Email enviado em ${new Date().toLocaleString("pt-PT", { 
                  timeZone: "Europe/Lisbon",
                  dateStyle: "full",
                  timeStyle: "short"
                })}
              </p>
            </div>
          </body>
          </html>
        `,
      });

      console.log("✅ [test-gmail-connection] Test email sent successfully");
      console.log("📧 [test-gmail-connection] Message ID:", info.messageId);

      return res.status(200).json({
        success: true,
        message: `✅ Gmail SMTP configured and test email sent to ${testEmail}`,
        messageId: info.messageId,
      });
    }

    return res.status(200).json({
      success: true,
      message: "✅ Gmail SMTP connection successful",
    });
  } catch (error) {
    console.error("❌ [test-gmail-connection] Error:", error);
    
    // Update test status in database
    await supabase
      .from("integration_settings")
      .update({
        test_status: "failed",
        test_message: error instanceof Error ? error.message : "Unknown error",
        last_tested_at: new Date().toISOString(),
      })
      .eq("integration_name", "gmail");

    let errorMessage = "Connection failed";
    
    if (error instanceof Error) {
      if (error.message.includes("Invalid login")) {
        errorMessage = "❌ Invalid Gmail credentials. Please check your email and App Password.";
      } else if (error.message.includes("EAUTH")) {
        errorMessage = "❌ Authentication failed. Make sure you're using an App Password, not your regular Gmail password.";
      } else if (error.message.includes("ECONNECTION") || error.message.includes("ETIMEDOUT")) {
        errorMessage = "❌ Connection timeout. Check your network connection.";
      } else {
        errorMessage = `❌ ${error.message}`;
      }
    }

    return res.status(500).json({
      success: false,
      message: errorMessage,
    });
  }
}