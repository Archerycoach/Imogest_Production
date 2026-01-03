import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/integrations/supabase/client";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const { to, subject, html } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({
        success: false,
        message: "Parâmetros obrigatórios: to (email), subject (assunto) e html (conteúdo)",
      });
    }

    // Get SendGrid integration settings
    const { data: integration, error: integrationError } = await supabase
      .from("integration_settings")
      .select("settings, is_active")
      .eq("integration_name", "sendgrid")
      .single();

    if (integrationError || !integration) {
      return res.status(400).json({
        success: false,
        message: "SendGrid não configurado",
      });
    }

    if (!integration.is_active) {
      return res.status(400).json({
        success: false,
        message: "SendGrid não está ativo",
      });
    }

    const settings = integration.settings as Record<string, any>;
    const { apiKey, fromEmail, fromName } = settings;

    if (!apiKey || !fromEmail) {
      return res.status(400).json({
        success: false,
        message: "Configuração SendGrid incompleta",
      });
    }

    // Send email via SendGrid
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: to }],
            subject: subject,
          },
        ],
        from: {
          email: fromEmail,
          name: fromName || "Imogest",
        },
        content: [
          {
            type: "text/html",
            value: html,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(400).json({
        success: false,
        message: `Erro SendGrid: ${errorData.errors?.[0]?.message || "Erro ao enviar email"}`,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Email enviado com sucesso!",
    });
  } catch (error: any) {
    console.error("Email send error:", error);
    return res.status(500).json({
      success: false,
      message: `Erro ao enviar email: ${error.message}`,
    });
  }
}