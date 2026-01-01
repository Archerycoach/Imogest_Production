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
    // Get Twilio settings from database using admin client
    const { data: integration, error } = await supabaseAdmin
      .from("integration_settings")
      .select("settings")
      .eq("integration_name", "twilio")
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
        message: "Twilio não configurado",
      });
    }

    const { accountSid, authToken, phoneNumber } = integration.settings as {
      accountSid?: string;
      authToken?: string;
      phoneNumber?: string;
    };

    if (!accountSid || !authToken || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Credenciais Twilio incompletas",
      });
    }

    // Test Twilio API by fetching account info
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      }
    );

    if (!response.ok) {
      return res.status(400).json({
        success: false,
        message: "Credenciais Twilio inválidas",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Conexão Twilio validada com sucesso!",
    });
  } catch (error: any) {
    console.error("❌ Test error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Erro ao testar Twilio",
    });
  }
}