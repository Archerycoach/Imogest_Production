import type { NextApiRequest, NextApiResponse } from "next";
import twilio from "twilio";
import { getTwilioCredentials } from "@/lib/integrationCredentials";
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

    // Get Twilio credentials from database
    const credentials = await getTwilioCredentials();

    if (!credentials || !credentials.accountSid || !credentials.authToken || !credentials.phoneNumber) {
      return res.status(500).json({
        error: "Twilio não está configurado. Por favor configure as credenciais em /admin/integrations",
      });
    }

    // Initialize Twilio client
    const client = twilio(credentials.accountSid, credentials.authToken);

    // Send SMS
    const twilioMessage = await client.messages.create({
      body: message,
      from: credentials.phoneNumber,
      to: to,
    });

    // Log interaction
    const { data: { user } } = await supabase.auth.getUser();
    if (user && leadId) {
      await supabase.from("interactions").insert({
        user_id: user.id,
        lead_id: leadId,
        interaction_type: "call", // Using "call" as proxy for SMS since schema doesn't have SMS type
        content: message,
        interaction_date: new Date().toISOString(),
        outcome: "sent",
      });
    }

    res.status(200).json({ 
      success: true, 
      message: "SMS enviado com sucesso",
      messageId: twilioMessage.sid 
    });
  } catch (error: any) {
    console.error("Error sending SMS:", error);
    res.status(500).json({ error: error.message || "Erro ao enviar SMS" });
  }
}