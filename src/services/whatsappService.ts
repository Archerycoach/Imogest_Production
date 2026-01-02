import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Template = Database["public"]["Tables"]["templates"]["Row"];
type Interaction = Database["public"]["Tables"]["interactions"]["Row"];

export const getWhatsAppTemplates = async () => {
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .eq("template_type", "whatsapp")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching whatsapp templates:", error);
    return [];
  }

  return data.map(t => ({
    id: t.id,
    name: t.name,
    content: t.body,
    variables: t.variables || []
  }));
};

export const sendWhatsAppMessage = async (
  to: string, 
  templateId: string, 
  variables: Record<string, string>,
  leadId?: string
) => {
  // 1. Get template
  const { data: template, error: templateError } = await supabase
    .from("templates")
    .select("*")
    .eq("id", templateId)
    .single();

  if (templateError || !template) throw new Error("Template not found");

  // 2. Replace variables
  let messageBody = template.body;
  Object.entries(variables).forEach(([key, value]) => {
    messageBody = messageBody.replace(new RegExp(`{{${key}}}`, 'g'), value);
  });

  // 3. Send via API endpoint (uses WhatsApp credentials from database)
  try {
    const response = await fetch("/api/integrations/send-whatsapp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to,
        message: messageBody,
        leadId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erro ao enviar WhatsApp");
    }

    return true;
  } catch (error) {
    console.error("Error sending WhatsApp:", error);
    throw error;
  }
};

export const createInteraction = async (interaction: any) => {
  const { data, error } = await supabase
    .from("interactions")
    .insert(interaction as any)
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

// Simplified automation management using lead_workflow_rules
export const getWhatsAppAutomations = async () => {
  const { data, error } = await supabase
    .from("lead_workflow_rules")
    .select("*")
    .eq("action_type", "send_email")
    .order("created_at", { ascending: false });

  if (error) return [];
  return data;
};

export const toggleAutomation = async (id: string, enabled: boolean) => {
  const { error } = await supabase
    .from("lead_workflow_rules")
    .update({ enabled })
    .eq("id", id);
    
  if (error) throw error;
  return true;
};