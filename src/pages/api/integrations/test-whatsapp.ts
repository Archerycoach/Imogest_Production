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
    // Get WhatsApp integration settings
    const { data: integration, error: integrationError } = await supabase
      .from("integration_settings")
      .select("settings, is_active")
      .eq("integration_name", "whatsapp")
      .single();

    if (integrationError || !integration) {
      return res.status(400).json({
        success: false,
        message: "WhatsApp não está configurado. Configure a integração primeiro.",
      });
    }

    if (!integration.is_active) {
      return res.status(400).json({
        success: false,
        message: "WhatsApp não está ativo. Ative a integração primeiro.",
      });
    }

    const settings = integration.settings as Record<string, any>;
    const { phoneNumberId, accessToken } = settings;

    if (!phoneNumberId || !accessToken) {
      return res.status(400).json({
        success: false,
        message: "Configuração incompleta. Verifique Phone Number ID e Access Token.",
      });
    }

    // Test WhatsApp API connection by fetching phone number details
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(400).json({
        success: false,
        message: `Erro WhatsApp API: ${data.error?.message || "Credenciais inválidas"}`,
      });
    }

    // Verify phone number is verified
    if (data.verified_name) {
      return res.status(200).json({
        success: true,
        message: `✅ WhatsApp conectado com sucesso! Número: ${data.display_phone_number} (${data.verified_name})`,
      });
    }

    return res.status(200).json({
      success: true,
      message: `✅ WhatsApp conectado! Número: ${data.display_phone_number}`,
    });
  } catch (error: any) {
    console.error("WhatsApp test error:", error);
    return res.status(500).json({
      success: false,
      message: `Erro ao testar WhatsApp: ${error.message}`,
    });
  }
}