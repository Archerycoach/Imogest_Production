import { supabase } from "@/integrations/supabase/client";

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
}

interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Check if Gmail is connected for the current user
 */
export const checkGmailConnection = async (): Promise<boolean> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;

    const { data, error } = await supabase
      .from("user_integrations")
      .select("is_active")
      .eq("user_id", session.user.id)
      .eq("integration_type", "gmail")
      .maybeSingle();

    if (error) return false;
    return data?.is_active || false;
  } catch (error) {
    console.error("❌ [gmailService] Error checking Gmail connection:", error);
    return false;
  }
};

/**
 * Send email via Gmail OAuth2 (calls backend API)
 */
export const sendEmail = async (options: EmailOptions): Promise<EmailResponse> => {
  try {
    console.log("📧 [gmailService] sendEmail called");
    console.log("📧 [gmailService] To:", options.to);
    console.log("📧 [gmailService] Subject:", options.subject);

    // Call backend API to send email
    const { data: { session } } = await supabase.auth.getSession();
    
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }

    const response = await fetch("/api/integrations/send-email", {
      method: "POST",
      headers,
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to send email");
    }

    const result = await response.json();

    console.log("✅ [gmailService] Email sent successfully");
    console.log("📧 [gmailService] Message ID:", result.messageId);

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    console.error("❌ [gmailService] Error sending email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Send task notification email
 */
export const sendTaskNotification = async (
  to: string,
  userName: string,
  tasks: Array<{ title: string; description?: string; priority: string; due_time?: string }>
): Promise<EmailResponse> => {
  const tasksList = tasks
    .map((task) => {
      const priorityEmoji = task.priority === "high" ? "🔴" : task.priority === "medium" ? "🟡" : "🟢";
      const time = task.due_time ? ` (${task.due_time})` : "";
      return `
        <div style="margin-bottom: 15px; padding: 10px; border-left: 3px solid #4F46E5; background: #F9FAFB;">
          <strong>${priorityEmoji} ${task.title}</strong>${time}
          ${task.description ? `<br><span style="color: #6B7280;">${task.description}</span>` : ""}
        </div>
      `;
    })
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">📋 Tarefas para Hoje</h1>
      </div>
      
      <div style="background: white; padding: 30px; border: 1px solid #E5E7EB; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="font-size: 16px; margin-bottom: 20px;">
          Olá <strong>${userName}</strong>,
        </p>
        
        <p style="margin-bottom: 20px;">
          Você tem <strong>${tasks.length} tarefa(s)</strong> agendada(s) para hoje:
        </p>
        
        ${tasksList}
        
        <div style="margin-top: 30px; padding: 15px; background: #F0FDF4; border-left: 3px solid #10B981; border-radius: 4px;">
          <p style="margin: 0; color: #065F46;">
            💡 <strong>Dica:</strong> Acesse o Imogest para visualizar todos os detalhes e atualizar o status das suas tarefas.
          </p>
        </div>
        
        <div style="margin-top: 30px; text-align: center;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/tasks" 
             style="display: inline-block; padding: 12px 30px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Ver Tarefas
          </a>
        </div>
      </div>
      
      <div style="margin-top: 20px; text-align: center; color: #6B7280; font-size: 12px;">
        <p>Imogest CRM - Sistema de Gestão Imobiliária</p>
        <p>Este é um email automático, por favor não responda.</p>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: `📋 Suas tarefas para hoje - ${new Date().toLocaleDateString("pt-PT")}`,
    html,
  });
};

/**
 * Send lead assigned notification email
 */
export const sendLeadAssignedNotification = async (
  to: string,
  agentName: string,
  leadName: string,
  leadEmail?: string,
  leadPhone?: string
): Promise<EmailResponse> => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #10B981; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">🎯 Nova Lead Atribuída</h1>
      </div>
      
      <div style="background: white; padding: 30px; border: 1px solid #E5E7EB; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="font-size: 16px; margin-bottom: 20px;">
          Olá <strong>${agentName}</strong>,
        </p>
        
        <p style="margin-bottom: 20px;">
          Uma nova lead foi atribuída a você:
        </p>
        
        <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="margin: 0 0 15px 0; color: #4F46E5; font-size: 20px;">${leadName}</h2>
          
          ${leadEmail ? `
          <p style="margin: 5px 0;">
            <strong>📧 Email:</strong> <a href="mailto:${leadEmail}" style="color: #4F46E5;">${leadEmail}</a>
          </p>
          ` : ""}
          
          ${leadPhone ? `
          <p style="margin: 5px 0;">
            <strong>📱 Telefone:</strong> <a href="tel:${leadPhone}" style="color: #4F46E5;">${leadPhone}</a>
          </p>
          ` : ""}
        </div>
        
        <div style="margin-top: 30px; padding: 15px; background: #FEF3C7; border-left: 3px solid #F59E0B; border-radius: 4px;">
          <p style="margin: 0; color: #92400E;">
            ⚡ <strong>Ação Recomendada:</strong> Entre em contato com a lead nas próximas 24 horas para maximizar as chances de conversão.
          </p>
        </div>
        
        <div style="margin-top: 30px; text-align: center;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/leads" 
             style="display: inline-block; padding: 12px 30px; background: #10B981; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Ver Lead no CRM
          </a>
        </div>
      </div>
      
      <div style="margin-top: 20px; text-align: center; color: #6B7280; font-size: 12px;">
        <p>Imogest CRM - Sistema de Gestão Imobiliária</p>
        <p>Este é um email automático, por favor não responda.</p>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: `🎯 Nova Lead Atribuída: ${leadName}`,
    html,
  });
};