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
    .from("templates") // Correct table
    .select("*")
    .eq("template_type", "email"); // Filter by type

  if (error) {
    console.error("Error fetching email templates:", error);
    return [];
  }

  return data;
};

export const sendEmail = async (
  to: string,
  subject: string,
  content: string, // Mapped to body internally if needed, or just used for sending
  relatedTo?: {
    leadId?: string;
    propertyId?: string;
  }
) => {
  // In a real app, this would call an Edge Function or external API (SendGrid, Resend, etc.)
  // For now, we'll log it as an interaction
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Log the interaction
    await supabase.from("interactions").insert({
      user_id: user.id,
      lead_id: relatedTo?.leadId,
      property_id: relatedTo?.propertyId,
      interaction_type: "email",
      subject: subject,
      content: content,
      interaction_date: new Date().toISOString(),
      outcome: "sent"
    });

    console.log(`[MOCK EMAIL] To: ${to}, Subject: ${subject}`);
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