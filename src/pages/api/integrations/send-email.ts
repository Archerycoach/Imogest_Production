import type { NextApiRequest, NextApiResponse } from "next";
import sgMail from "@sendgrid/mail";
import { getSendGridCredentials } from "@/lib/integrationCredentials";
import { supabase } from "@/integrations/supabase/client";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { to, subject, content, leadId, propertyId } = req.body;

    if (!to || !subject || !content) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Get SendGrid credentials from database
    const credentials = await getSendGridCredentials();

    if (!credentials || !credentials.apiKey) {
      return res.status(500).json({
        error: "SendGrid não está configurado. Por favor configure as credenciais em /admin/integrations",
      });
    }

    // Set SendGrid API key
    sgMail.setApiKey(credentials.apiKey);

    // Send email
    await sgMail.send({
      to,
      from: {
        email: credentials.fromEmail,
        name: credentials.fromName,
      },
      subject,
      html: content,
    });

    // Log interaction
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("interactions").insert({
        user_id: user.id,
        lead_id: leadId,
        property_id: propertyId,
        interaction_type: "email",
        subject: subject,
        content: content,
        interaction_date: new Date().toISOString(),
        outcome: "sent",
      });
    }

    res.status(200).json({ success: true, message: "Email enviado com sucesso" });
  } catch (error: any) {
    console.error("Error sending email:", error);
    res.status(500).json({ error: error.message || "Erro ao enviar email" });
  }
}