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
    console.log("🧪 [test-gmail] Testing Gmail SMTP connection...");

    // Get Gmail SMTP configuration from database
    const { data: integration, error: integrationError } = await supabase
      .from("integration_settings")
      .select("config, is_active")
      .eq("integration_name", "gmail_smtp")
      .single();

    if (integrationError || !integration) {
      return res.status(500).json({
        success: false,
        error: "Gmail SMTP integration not configured",
      });
    }

    if (!integration.is_active) {
      return res.status(500).json({
        success: false,
        error: "Gmail SMTP integration not active",
      });
    }

    const config = integration.config as any;

    if (!config.smtp_user || !config.smtp_pass) {
      return res.status(500).json({
        success: false,
        error: "Gmail SMTP credentials not configured",
      });
    }

    // Create Transporter
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: config.smtp_user,
        pass: config.smtp_pass,
      },
    });

    // Test connection
    console.log("🔍 [test-gmail] Verifying SMTP connection...");
    await transporter.verify();
    console.log("✅ [test-gmail] SMTP connection successful");

    // Send test email
    const { testEmail } = req.body;

    if (testEmail) {
      console.log("📧 [test-gmail] Sending test email to:", testEmail);

      const info = await transporter.sendMail({
        from: {
          name: config.from_name || "Imogest CRM",
          address: config.from_email || config.smtp_user,
        },
        to: testEmail,
        subject: "🧪 Teste Gmail SMTP - Imogest CRM",
        html: `
          <!DOCTYPE html>
          <html>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h1 style="color: #4F46E5;">✅ Gmail SMTP Configurado!</h1>
            <p>Este é um email de teste do sistema Imogest CRM.</p>
            <p><strong>Status:</strong> Configuração Gmail SMTP funcionando corretamente.</p>
            <hr style="margin: 20px 0;">
            <p style="color: #6B7280; font-size: 12px;">
              Email enviado em ${new Date().toLocaleString("pt-PT")}
            </p>
          </body>
          </html>
        `,
      });

      console.log("✅ [test-gmail] Test email sent successfully");
      console.log("📧 [test-gmail] Message ID:", info.messageId);

      return res.status(200).json({
        success: true,
        message: "Gmail SMTP configured and working",
        messageId: info.messageId,
        connectionTest: "passed",
        emailTest: "passed",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Gmail SMTP connection successful",
      connectionTest: "passed",
    });
  } catch (error) {
    console.error("❌ [test-gmail] Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}