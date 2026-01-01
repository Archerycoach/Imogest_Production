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
    // Get EuPago settings from database using admin client
    const { data: integration, error } = await supabaseAdmin
      .from("integration_settings")
      .select("settings")
      .eq("integration_name", "eupago")
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
        message: "EuPago não configurado",
      });
    }

    const { apiKey } = integration.settings as {
      apiKey?: string;
      webhookKey?: string;
    };

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: "API Key do EuPago em falta",
      });
    }

    // Validate API key format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(apiKey)) {
      return res.status(400).json({
        success: false,
        message: "Formato da API Key inválido (deve ser UUID)",
      });
    }

    // Note: EuPago doesn't have a simple test endpoint
    // We validate the format and assume it's correct
    return res.status(200).json({
      success: true,
      message: "Credenciais EuPago validadas (formato correto)",
    });
  } catch (error: any) {
    console.error("❌ Test error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Erro ao testar EuPago",
    });
  }
}