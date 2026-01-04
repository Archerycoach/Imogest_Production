import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/integrations/supabase/client";

// API endpoint to send email notification when a new lead is assigned
// This should be called from the leads assignment logic

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { assignedToUserId, leadId } = req.body;

    if (!assignedToUserId || !leadId) {
      return res.status(400).json({ 
        success: false,
        message: "Missing required fields: assignedToUserId, leadId" 
      });
    }

    // ✅ CRITICAL: Get user profile and check if they want email notifications
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, email, reply_email, email_new_lead_assigned")
      .eq("id", assignedToUserId)
      .single();

    if (profileError || !profile) {
      console.error("Error fetching user profile:", profileError);
      return res.status(404).json({
        success: false,
        message: "User profile not found"
      });
    }

    // Check if user has email notifications enabled for new leads
    if (!profile.email_new_lead_assigned) {
      console.log(`User ${profile.email} has disabled new lead email notifications`);
      return res.status(200).json({
        success: true,
        message: "User has disabled email notifications for new leads"
      });
    }

    // ✅ Get lead details
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, name, email, phone, source, status")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      console.error("Error fetching lead:", leadError);
      return res.status(404).json({
        success: false,
        message: "Lead not found"
      });
    }

    // ✅ Get MailerSend credentials from integration_settings
    const { data: integration, error: integrationError } = await supabase
      .from("integration_settings")
      .select("settings, is_active")
      .eq("integration_name", "mailersend")
      .single();

    if (integrationError || !integration) {
      console.error("MailerSend not configured:", integrationError);
      return res.status(500).json({
        success: false,
        message: "MailerSend integration not configured"
      });
    }

    if (!integration.is_active) {
      console.error("MailerSend integration is not active");
      return res.status(500).json({
        success: false,
        message: "MailerSend integration is not active"
      });
    }

    // ✅ Extract credentials from database settings with proper typing
    const settings = integration.settings as { apiKey: string; fromEmail: string; fromName?: string };
    const { apiKey, fromEmail, fromName } = settings;

    if (!apiKey || !fromEmail) {
      console.error("MailerSend credentials incomplete");
      return res.status(500).json({
        success: false,
        message: "MailerSend credentials incomplete"
      });
    }

    // ✅ Prepare email content
    const emailTo = profile.reply_email || profile.email;
    const userName = profile.full_name || "Utilizador";
    
    const emailSubject = `🎯 Nova Lead Atribuída: ${lead.name}`;
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🎯 Nova Lead Atribuída!</h1>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="color: #1e293b; font-size: 16px; margin-bottom: 20px;">
            Olá <strong>${userName}</strong>! 👋
          </p>
          
          <p style="color: #64748b; margin-bottom: 30px;">
            Foi-lhe atribuída uma nova lead. Aqui estão os detalhes:
          </p>

          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin-bottom: 20px;">
            <h3 style="color: #1e293b; margin-top: 0;">👤 ${lead.name}</h3>
            
            ${lead.email ? `
              <p style="color: #64748b; margin: 10px 0;">
                <strong>📧 Email:</strong> <a href="mailto:${lead.email}" style="color: #667eea;">${lead.email}</a>
              </p>
            ` : ''}
            
            ${lead.phone ? `
              <p style="color: #64748b; margin: 10px 0;">
                <strong>📱 Telefone:</strong> <a href="tel:${lead.phone}" style="color: #667eea;">${lead.phone}</a>
              </p>
            ` : ''}
            
            <p style="color: #64748b; margin: 10px 0;">
              <strong>📍 Origem:</strong> ${lead.source || "Não especificada"}
            </p>
            
            <p style="color: #64748b; margin: 10px 0;">
              <strong>🎯 Status:</strong> <span style="background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 12px; font-size: 14px;">${lead.status || "Novo"}</span>
            </p>
          </div>

          <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h4 style="color: #1e40af; margin-top: 0;">💡 Próximos Passos Recomendados:</h4>
            <ul style="color: #64748b; margin: 10px 0; padding-left: 20px;">
              <li style="margin: 8px 0;">Contactar a lead nas próximas 24 horas</li>
              <li style="margin: 8px 0;">Qualificar as necessidades e preferências</li>
              <li style="margin: 8px 0;">Agendar uma visita ou reunião</li>
              <li style="margin: 8px 0;">Atualizar o status no CRM</li>
            </ul>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://imogest.vercel.app'}/leads" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; 
                      padding: 15px 40px; 
                      text-decoration: none; 
                      border-radius: 8px; 
                      display: inline-block;
                      font-weight: bold;">
              Ver Lead no CRM →
            </a>
          </div>

          <p style="color: #94a3b8; font-size: 14px; margin-top: 30px; text-align: center;">
            Boa sorte com a sua nova lead! 🚀
          </p>
        </div>
      </div>
    `;

    // ✅ Send email via MailerSend
    const response = await fetch("https://api.mailersend.com/v1/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: {
          email: fromEmail,
          name: fromName || "Imogest",
        },
        to: [
          {
            email: emailTo,
            name: userName,
          },
        ],
        subject: emailSubject,
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("MailerSend API error:", errorText);
      return res.status(500).json({
        success: false,
        message: `Erro ao enviar email via MailerSend: ${errorText}`,
      });
    }

    console.log(`✅ New lead assignment email sent to ${emailTo}`);

    return res.status(200).json({
      success: true,
      message: "Email de nova lead enviado com sucesso!",
    });

  } catch (error: any) {
    console.error("Error in new-lead-assigned notification:", error);
    return res.status(500).json({
      success: false,
      message: `Erro ao enviar notificação: ${error.message}`,
    });
  }
}