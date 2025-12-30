import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { processLeadWorkflows } from "./workflowService";

// Use standard types
type Lead = Database["public"]["Tables"]["leads"]["Row"];
type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];
type LeadUpdate = Database["public"]["Tables"]["leads"]["Update"];
type Interaction = Database["public"]["Tables"]["interactions"]["Row"];
type InteractionInsert = Database["public"]["Tables"]["interactions"]["Insert"];

export interface LeadWithDetails extends Lead {
  assigned_user?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  // property relationship in DB might return array or single object depending on query
  // For now, let's keep it optional/flexible or handle it in the transformer
  interactions?: Interaction[];
}

// Get all leads with filters
export const getLeads = async () => {
  const { data, error } = await supabase
    .from("leads")
    .select(`
      *,
      contact:contacts!leads_contact_id_fkey (*)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[LeadsService] Error in getLeads:", error);
    return [];
  }

  return (data as unknown) as Lead[];
};

// Get single lead with full details
export const getLead = async (id: string): Promise<LeadWithDetails | null> => {
  try {
    const { data, error } = await supabase
      .from("leads")
      .select(`
        *,
        assigned_user:profiles!leads_assigned_to_fkey(id, full_name, email),
        property:properties(id, title, address),
        interactions(
          *,
          user:profiles!interactions_created_by_fkey(id, full_name, email)
        )
      `)
      .eq("id", id)
      .single();

    if (error) throw error;

    return data as LeadWithDetails;
  } catch (error: any) {
    console.error("[LeadsService] Error in getLead:", error);
    throw error;
  }
};

// Create new lead
export const createLead = async (lead: LeadInsert) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("leads")
    .insert({
      ...lead,
      user_id: user.id,
      status: (lead.status || "new") as any,
      lead_type: (lead.lead_type || "buyer") as any
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Update lead
export const updateLead = async (id: string, updates: LeadUpdate) => {
  const { data, error } = await supabase
    .from("leads")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    } as any) // Cast to any
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Delete lead
export const deleteLead = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from("leads")
      .delete()
      .eq("id", id);

    if (error) throw error;
  } catch (error: any) {
    console.error("[LeadsService] Error in deleteLead:", error);
    throw error;
  }
};

// Add interaction to lead
export const addLeadInteraction = async (
  interaction: InteractionInsert
): Promise<Interaction> => {
  try {
    const { data, error } = await supabase
      .from("interactions")
      .insert(interaction)
      .select()
      .single();

    if (error) throw error;

    // Update last_contact_date on the lead
    await supabase
      .from("leads")
      .update({ last_contact_date: new Date().toISOString() })
      .eq("id", interaction.lead_id);

    return data;
  } catch (error: any) {
    console.error("[LeadsService] Error in addLeadInteraction:", error);
    throw error;
  }
};

// Get lead interactions
export const getLeadInteractions = async (leadId: string): Promise<Interaction[]> => {
  try {
    const { data, error } = await supabase
      .from("interactions")
      .select(`
        *,
        user:profiles!interactions_created_by_fkey(id, full_name, email)
      `)
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error: any) {
    console.error("[LeadsService] Error in getLeadInteractions:", error);
    throw error;
  }
};

// Get pipeline stages
export const getPipelineStages = async () => {
  // Return static stages for V2 as pipeline_stages table is removed
  return [
    { id: 'new', name: 'Novo', order_index: 0 },
    { id: 'contacted', name: 'Contactado', order_index: 1 },
    { id: 'qualified', name: 'Qualificado', order_index: 2 },
    { id: 'proposal', name: 'Proposta', order_index: 3 },
    { id: 'negotiation', name: 'Negociação', order_index: 4 },
    { id: 'won', name: 'Ganho', order_index: 5 },
    { id: 'lost', name: 'Perdido', order_index: 6 }
  ];
};

export const updateLeadStatus = async (id: string, status: string) => {
  const { data, error } = await supabase
    .from("leads")
    .update({ status: status as any }) // Cast to any to bypass strict enum check if string comes from UI
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[LeadsService] Error updating lead status:", error);
    throw error;
  }
  return data;
};

// Get leads by stage (for pipeline view)
export const getLeadsByStage = async (): Promise<Record<string, LeadWithDetails[]>> => {
  try {
    const leads = await getLeads();
    const stages = await getPipelineStages();

    const leadsByStage: Record<string, LeadWithDetails[]> = {};

    stages.forEach(stage => {
      leadsByStage[stage.name] = leads.filter(lead => lead.status === stage.name.toLowerCase().replace(/\s+/g, '_'));
    });

    return leadsByStage;
  } catch (error: any) {
    console.error("[LeadsService] Error in getLeadsByStage:", error);
    throw error;
  }
};

// Get lead statistics
export const getLeadStats = async () => {
  const { data, error } = await supabase
    .from("leads")
    .select("status, lead_type"); 

  if (error) {
    console.error("[LeadsService] Error in getLeadStats:", error);
    throw error;
  }

  const stats = {
    total: data.length,
    new: data.filter(l => l.status === "new").length,
    contacted: data.filter(l => l.status === "contacted").length,
    qualified: data.filter(l => l.status === "qualified").length,
    proposal: data.filter(l => l.status === "proposal").length,
    won: data.filter(l => l.status === "won").length,
    lost: data.filter(l => l.status === "lost").length,
    negotiation: data.filter(l => l.status === "negotiation").length, // Added negotiation
    buyers: data.filter(l => l.lead_type === "buyer" || l.lead_type === "both").length,
    sellers: data.filter(l => l.lead_type === "seller" || l.lead_type === "both").length,
    conversionRate: data.length > 0 
      ? ((data.filter(l => l.status === "won").length / data.length) * 100).toFixed(1)
      : "0.0",
  };

  return stats;
};

// Assign lead to user
export const assignLead = async (leadId: string, userId: string): Promise<void> => {
  try {
    // assigned_to column removed in V2, logic needs to change or be removed
    // For now, logging warning as functionality is deprecated
    console.warn("Assigning leads is deprecated in V2 schema");
    
    /* 
    await updateLead(leadId, { assigned_to: userId }); 
    */
  } catch (error: any) {
    console.error("[LeadsService] Error in assignLead:", error);
    throw error;
  }
};