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
    const { to, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({
        success: false,
        message: "Parâmetros obrigatórios: to (número) e message (texto)",
      });
    }

    // Get WhatsApp integration settings
    const { data: integration, error: integrationError } = await supabase
      .from("integration_settings")
      .select("settings, is_active")
      .eq("integration_name", "whatsapp")
      .single();

    if (integrationError || !integration) {
      return res.status(400).json({
        success: false,
        message: "WhatsApp não configurado",
      });
    }

    if (!integration.is_active) {
      return res.status(400).json({
        success: false,
        message: "WhatsApp não está ativo",
      });
    }

    const settings = integration.settings as Record<string, any>;
    const { phoneNumberId, accessToken } = settings;

    if (!phoneNumberId || !accessToken) {
      return res.status(400).json({
        success: false,
        message: "Configuração WhatsApp incompleta",
      });
    }

    // Format phone number (remove + and spaces)
    const formattedPhone = to.replace(/[^0-9]/g, "");

    // Send WhatsApp message
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: formattedPhone,
          type: "text",
          text: {
            body: message,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(400).json({
        success: false,
        message: `Erro WhatsApp: ${data.error?.message || "Erro ao enviar mensagem"}`,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Mensagem WhatsApp enviada com sucesso!",
      messageId: data.messages?.[0]?.id,
    });
  } catch (error: any) {
    console.error("WhatsApp send error:", error);
    return res.status(500).json({
      success: false,
      message: `Erro ao enviar WhatsApp: ${error.message}`,
    });
  }
}