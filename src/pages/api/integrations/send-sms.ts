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

    // Get Twilio integration settings
    const { data: integration, error: integrationError } = await supabase
      .from("integration_settings")
      .select("settings, is_active")
      .eq("integration_name", "twilio")
      .single();

    if (integrationError || !integration) {
      return res.status(400).json({
        success: false,
        message: "Twilio não configurado",
      });
    }

    if (!integration.is_active) {
      return res.status(400).json({
        success: false,
        message: "Twilio não está ativo",
      });
    }

    const settings = integration.settings as Record<string, any>;
    const { accountSid, authToken, phoneNumber } = settings;

    if (!accountSid || !authToken || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Configuração Twilio incompleta",
      });
    }

    // Send SMS via Twilio
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: to,
          From: phoneNumber,
          Body: message,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(400).json({
        success: false,
        message: `Erro Twilio: ${data.message || "Erro ao enviar SMS"}`,
      });
    }

    return res.status(200).json({
      success: true,
      message: "SMS enviado com sucesso!",
      messageId: data.sid,
    });
  } catch (error: any) {
    console.error("SMS send error:", error);
    return res.status(500).json({
      success: false,
      message: `Erro ao enviar SMS: ${error.message}`,
    });
  }
}