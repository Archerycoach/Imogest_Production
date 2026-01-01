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
    // Get Stripe settings from database using admin client
    const { data: integration, error } = await supabaseAdmin
      .from("integration_settings")
      .select("settings")
      .eq("integration_name", "stripe")
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
        message: "Stripe não configurado",
      });
    }

    const { secretKey } = integration.settings as {
      publishableKey?: string;
      secretKey?: string;
      webhookSecret?: string;
    };

    if (!secretKey) {
      return res.status(400).json({
        success: false,
        message: "Secret Key do Stripe em falta",
      });
    }

    // Test Stripe API connection
    const response = await fetch("https://api.stripe.com/v1/balance", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    });

    if (!response.ok) {
      return res.status(400).json({
        success: false,
        message: "Credenciais Stripe inválidas",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Conexão Stripe validada com sucesso!",
    });
  } catch (error: any) {
    console.error("❌ Test error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Erro ao testar Stripe",
    });
  }
}