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
    // Get SendGrid settings from database using admin client
    const { data: integration, error } = await supabaseAdmin
      .from("integration_settings")
      .select("settings")
      .eq("integration_name", "sendgrid")
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
        message: "SendGrid não configurado",
      });
    }

    const { apiKey, fromEmail } = integration.settings as {
      apiKey?: string;
      fromEmail?: string;
      fromName?: string;
    };

    if (!apiKey || !fromEmail) {
      return res.status(400).json({
        success: false,
        message: "Credenciais SendGrid incompletas",
      });
    }

    // Test SendGrid API with API key validation
    const response = await fetch("https://api.sendgrid.com/v3/scopes", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return res.status(400).json({
        success: false,
        message: "API Key do SendGrid inválida",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Conexão SendGrid validada com sucesso!",
    });
  } catch (error: any) {
    console.error("❌ Test error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Erro ao testar SendGrid",
    });
  }
}