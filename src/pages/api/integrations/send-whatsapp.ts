import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getWhatsAppCredentials } from "@/lib/integrationCredentials";
import { supabase } from "@/integrations/supabase/client";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { to, message, leadId } = req.body;

    if (!to || !message) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Get WhatsApp credentials from database
    const credentials = await getWhatsAppCredentials();

    if (!credentials || !credentials.phoneNumberId || !credentials.accessToken) {
      return res.status(500).json({
        error: "WhatsApp não está configurado. Por favor configure as credenciais em /admin/integrations",
      });
    }

    // Send WhatsApp message via Meta API
    const response = await axios.post(
      `https://graph.facebook.com/v17.0/${credentials.phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        to: to,
        type: "text",
        text: {
          body: message,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Log interaction
    const { data: { user } } = await supabase.auth.getUser();
    if (user && leadId) {
      await supabase.from("interactions").insert({
        user_id: user.id,
        lead_id: leadId,
        interaction_type: "whatsapp",
        content: message,
        interaction_date: new Date().toISOString(),
        outcome: "sent",
      });
    }

    res.status(200).json({ 
      success: true, 
      message: "WhatsApp enviado com sucesso",
      messageId: response.data.messages?.[0]?.id 
    });
  } catch (error: any) {
    console.error("Error sending WhatsApp:", error);
    res.status(500).json({ 
      error: error.response?.data?.error?.message || error.message || "Erro ao enviar WhatsApp" 
    });
  }
}