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

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  userId?: string;
}

/**
 * Send email using Gmail OAuth2 integration
 * Calls the backend API which uses the user's connected Gmail account
 */
export const sendEmail = async (options: EmailOptions): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return { success: false, error: "User not authenticated" };
    }

    const response = await fetch("/api/integrations/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(options),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Failed to send email");
    }

    return { success: true };
  } catch (error: any) {
    console.error("❌ [emailService] Error sending email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
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