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
    // ✅ CRITICAL: Credentials ONLY from database, NEVER from .env
    // Get MailerSend settings from integration_settings table using admin client
    const { data: integration, error } = await supabaseAdmin
      .from("integration_settings")
      .select("settings")
      .eq("integration_name", "mailersend")
      .single();

    if (error) {
      console.error("❌ Database error:", error);
      return res.status(500).json({
        success: false,
        message: `Erro ao ler configuração da base de dados: ${error.message}`,
      });
    }

    if (!integration || !integration.settings) {
      return res.status(400).json({
        success: false,
        message: "MailerSend não está configurado. Por favor configure primeiro nas Integrações.",
      });
    }

    // ✅ Extract credentials from database settings (NOT from .env)
    const { apiKey, fromEmail } = integration.settings as {
      apiKey?: string;
      fromEmail?: string;
      fromName?: string;
    };

    if (!apiKey || !fromEmail) {
      return res.status(400).json({
        success: false,
        message: "Credenciais MailerSend incompletas (API Token e Email Remetente obrigatórios)",
      });
    }

    // Validate API token format
    if (!apiKey.startsWith("mlsn.")) {
      return res.status(400).json({
        success: false,
        message: "API Token inválido. Deve começar com 'mlsn.'",
      });
    }

    // ✅ Test MailerSend API with token validation (using credentials from database)
    const response = await fetch("https://api.mailersend.com/v1/token", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(400).json({
        success: false,
        message: `API Token do MailerSend inválido: ${errorData.message || "Token não autorizado"}`,
      });
    }

    const tokenData = await response.json();

    return res.status(200).json({
      success: true,
      message: `✓ Conexão MailerSend validada com sucesso! Token: ${tokenData.data.name || "válido"}`,
    });
  } catch (error: any) {
    console.error("❌ Test error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Erro ao testar MailerSend",
    });
  }
}