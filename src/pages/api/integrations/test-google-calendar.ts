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
    // Debug: Log environment variables being used
    console.log("🔧 [test-google-calendar] Environment check:");
    console.log("  - NEXT_PUBLIC_SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log("  - SUPABASE_SERVICE_ROLE_KEY length:", process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0);
    console.log("  - SUPABASE_SERVICE_ROLE_KEY first 30:", process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 30) || "NOT_SET");

    // Get Google Calendar settings from database using admin client
    console.log("🔧 [test-google-calendar] Attempting to query integration_settings...");
    const { data: integration, error } = await supabaseAdmin
      .from("integration_settings")
      .select("settings")
      .eq("integration_name", "google_calendar")
      .single();

    console.log("🔧 [test-google-calendar] Query result:");
    console.log("  - Error:", error);
    console.log("  - Data:", integration);

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
        message: "Google Calendar não configurado",
      });
    }

    const { clientId, clientSecret, redirectUri } = integration.settings as {
      clientId?: string;
      clientSecret?: string;
      redirectUri?: string;
    };

    if (!clientId || !clientSecret || !redirectUri) {
      return res.status(400).json({
        success: false,
        message: "Credenciais Google Calendar incompletas",
      });
    }

    // Validate OAuth2 credentials format
    if (!clientId.includes(".apps.googleusercontent.com")) {
      return res.status(400).json({
        success: false,
        message: "Client ID inválido (deve terminar com .apps.googleusercontent.com)",
      });
    }

    if (!clientSecret.startsWith("GOCSPX-")) {
      return res.status(400).json({
        success: false,
        message: "Client Secret inválido (deve começar com GOCSPX-)",
      });
    }

    // Note: We can't fully test OAuth without user interaction
    // But we can validate the credentials format
    return res.status(200).json({
      success: true,
      message: "Credenciais Google Calendar validadas (formato correto)",
    });
  } catch (error: any) {
    console.error("❌ Test error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Erro ao testar Google Calendar",
    });
  }
}