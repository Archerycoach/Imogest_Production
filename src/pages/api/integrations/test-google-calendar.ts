import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get credentials from database
    const { data: integrationData, error: integrationError } = await supabaseAdmin
      .from("integration_settings")
      .select("settings, is_active")
      .eq("integration_name", "google_calendar")
      .single();

    if (integrationError || !integrationData) {
      return res.status(500).json({
        success: false,
        message: "Google Calendar não está configurado",
      });
    }

    if (!integrationData.is_active) {
      return res.status(400).json({
        success: false,
        message: "Google Calendar está desativado",
      });
    }

    const settings = integrationData.settings as any;
    const clientId = settings?.clientId;

    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: "Credenciais do Google Calendar incompletas",
      });
    }

    // Simple validation - check if credentials exist
    res.status(200).json({
      success: true,
      message: "Credenciais do Google Calendar configuradas corretamente",
    });
  } catch (error: any) {
    console.error("Error testing Google Calendar:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erro ao testar Google Calendar",
    });
  }
}