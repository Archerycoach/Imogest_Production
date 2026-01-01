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
    // Get Google Maps settings from database using admin client
    const { data: integration, error } = await supabaseAdmin
      .from("integration_settings")
      .select("settings")
      .eq("integration_name", "google_maps")
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
        message: "Google Maps não configurado",
      });
    }

    const { apiKey } = integration.settings as {
      apiKey?: string;
    };

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: "API Key do Google Maps em falta",
      });
    }

    // Test Google Maps API with a simple geocoding request
    const testAddress = "Lisbon, Portugal";
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(testAddress)}&key=${apiKey}`
    );

    const data = await response.json();

    if (data.status !== "OK") {
      return res.status(400).json({
        success: false,
        message: `Erro Google Maps: ${data.error_message || "API Key inválida"}`,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Conexão Google Maps validada com sucesso!",
    });
  } catch (error: any) {
    console.error("❌ Test error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Erro ao testar Google Maps",
    });
  }
}