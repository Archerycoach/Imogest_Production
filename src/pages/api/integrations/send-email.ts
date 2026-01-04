import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/integrations/supabase/client";

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  leadId?: string;
  propertyId?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { to, subject, html, leadId, propertyId } = req.body as EmailRequest;

    if (!to || !subject || !html) {
      return res.status(400).json({
        success: false,
        message: "Campos obrigatórios: to, subject, html",
      });
    }

    // ✅ Get authenticated user session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return res.status(401).json({
        success: false,
        message: "Não autenticado. Faça login novamente.",
      });
    }

    // ✅ Get user profile for reply_email and full_name
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, email, reply_email")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return res.status(400).json({
        success: false,
        message: "Perfil do utilizador não encontrado.",
      });
    }

    // ✅ CRITICAL: Get MailerSend credentials ONLY from database, NEVER from .env
    const { data: integration, error: integrationError } = await supabase
      .from("integration_settings")
      .select("settings, is_active")
      .eq("integration_name", "mailersend")
      .single();

    if (integrationError || !integration) {
      return res.status(400).json({
        success: false,
        message: "MailerSend não está configurado. Configure em Admin → Integrações.",
      });
    }

    if (!integration.is_active) {
      return res.status(400).json({
        success: false,
        message: "Integração MailerSend está desativada. Ative em Admin → Integrações.",
      });
    }

    // ✅ Extract credentials from database (NOT from .env)
    const { apiKey, fromEmail, fromName } = integration.settings as {
      apiKey?: string;
      fromEmail?: string;
      fromName?: string;
    };

    if (!apiKey || !fromEmail) {
      return res.status(400).json({
        success: false,
        message: "Credenciais MailerSend incompletas na base de dados",
      });
    }

    // ✅ Prepare reply-to: Use reply_email if set, otherwise use account email
    const replyToEmail = profile.reply_email || profile.email;
    const senderName = profile.full_name || fromName || "Imogest";

    // ✅ Send email using MailerSend API with reply-to header
    const response = await fetch("https://api.mailersend.com/v1/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: {
          email: fromEmail,
          name: `${senderName} (Imogest)`, // Shows: "João Silva (Imogest)"
        },
        to: [
          {
            email: to,
          },
        ],
        reply_to: {
          email: replyToEmail,
          name: senderName, // Client replies to user's configured email
        },
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Erro ao enviar email via MailerSend");
    }

    return res.status(200).json({
      success: true,
      message: "Email enviado com sucesso!",
      details: {
        from: `${senderName} (Imogest) <${fromEmail}>`,
        replyTo: `${senderName} <${replyToEmail}>`,
      },
    });
  } catch (error: any) {
    console.error("Error sending email:", error);
    return res.status(500).json({
      success: false,
      message: `Erro ao enviar email: ${error.message}`,
    });
  }
}