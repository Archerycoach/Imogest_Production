import { supabase } from "@/integrations/supabase/client";

// Types
interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  template_type: string;
}

export const getEmailTemplates = async () => {
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .eq("template_type", "email");

  if (error) {
    console.error("Error fetching email templates:", error);
    return [];
  }

  return data;
};

export const sendEmail = async (
  to: string,
  subject: string,
  content: string,
  relatedTo?: {
    leadId?: string;
    propertyId?: string;
  }
) => {
  try {
    // Call API endpoint to send email (uses MailerSend credentials from database)
    const response = await fetch("/api/integrations/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to,
        subject,
        html: content,
        leadId: relatedTo?.leadId,
        propertyId: relatedTo?.propertyId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao enviar email");
    }

    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

export const createEmailTemplate = async (template: { name: string; subject: string; body: string }) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("templates")
    .insert({
      user_id: user.id,
      name: template.name,
      subject: template.subject,
      body: template.body,
      template_type: "email"
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateEmailTemplate = async (id: string, updates: { name?: string; subject?: string; body?: string }) => {
  const { data, error } = await supabase
    .from("templates")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteEmailTemplate = async (id: string) => {
  const { error } = await supabase
    .from("templates")
    .delete()
    .eq("id", id);

  if (error) throw error;
  return true;
};