import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    // Get WhatsApp settings from database using admin client
    const { data: integration, error } = await supabaseAdmin
      .from("integration_settings")
      .select("settings")
      .eq("integration_name", "whatsapp")
      .single();

    if (error) {
      console.error("❌ Database error:", error);
      return res.status(500).json({
        success: false,
        message: `Erro ao ler configuração: ${error.message}`,
      });
    }

    if (!integration || !integration.settings) {
      return res.status(400).json({
        success: false,
        message: "WhatsApp não configurado",
      });
    }

    const { phoneNumberId, accessToken } = integration.settings as {
      phoneNumberId?: string;
      accessToken?: string;
    };

    if (!phoneNumberId || !accessToken) {
      return res.status(400).json({
        success: false,
        message: "Credenciais WhatsApp incompletas",
      });
    }

    // Test WhatsApp API connection
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(400).json({
        success: false,
        message: `Erro WhatsApp: ${errorData.error?.message || "Credenciais inválidas"}`,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Conexão WhatsApp validada com sucesso!",
    });
  } catch (error: any) {
    console.error("❌ Test error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Erro ao testar WhatsApp",
    });
  }
}