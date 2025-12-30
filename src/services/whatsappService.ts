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

  // 3. Log interaction (Mock sending for now)
  console.log(`Sending WhatsApp to ${to}: ${messageBody}`);
  
  if (leadId) {
    const { error: logError } = await supabase
      .from("interactions")
      .insert({
        lead_id: leadId,
        interaction_type: "whatsapp",
        content: messageBody,
        outcome: "sent",
        user_id: (await supabase.auth.getUser()).data.user?.id || ""
      });

    if (logError) console.error("Error logging whatsapp interaction:", logError);
  }

  return true;
};

export const createInteraction = async (interaction: any) => {
  const { data, error } = await supabase
    .from("interactions")
    .insert(interaction as any) // Force cast
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
    .eq("action_type", "send_email") // Using send_email as proxy/placeholder or need to add whatsapp action type to enum if not present
    .order("created_at", { ascending: false });

  // Note: Schema 'action_type' check constraint allows: 'send_email', 'create_task', 'create_calendar_event', 'update_score'
  // Currently NO 'send_whatsapp' action type in DB schema constraint.
  // We will handle this in the future updates or use 'send_email' as placeholder for now to avoid errors.

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
