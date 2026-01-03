import { supabase } from "@/integrations/supabase/client";
import { getCachedData, setCachedData } from "@/lib/cacheUtils";
import { CacheManager, CacheKey } from "@/lib/cacheInvalidation";
import type { Database } from "@/integrations/supabase/types";
import { processLeadWorkflows } from "./workflowService";

const LEADS_CACHE_KEY = CacheKey.LEADS;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// Use standard types from Database
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
  interactions?: Interaction[];
}

export type LeadWithContacts = LeadWithDetails;

// Get all leads with filters
export const getLeads = async () => {
  const { data, error } = await supabase
    .from("leads")
    .select(`
      *,
      contact:contacts!leads_contact_id_fkey (*)
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as unknown) as Lead[];
};

// Alias for compatibility with existing code
export const getAllLeads = async (useCache = true): Promise<Lead[]> => {
  try {
    // Check cache first
    if (useCache) {
      const cached = getCachedData<Lead[]>(LEADS_CACHE_KEY, CACHE_TTL);
      if (cached) return cached;
    }
    
    const { data, error } = await supabase
      .from("leads")
      .select(`
        *,
        contact:contacts!leads_contact_id_fkey (*)
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;
    const leads = data || [];
    
    // Cache the result
    if (useCache) {
      setCachedData(LEADS_CACHE_KEY, leads);
    }
    
    return leads;
  } catch (e) {
    throw e;
  }
};

// Get single lead with full details
export const getLead = async (id: string): Promise<LeadWithDetails | null> => {
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
};

// Create new lead
export const createLead = async (lead: Omit<Lead, "id" | "created_at" | "updated_at">): Promise<Lead> => {
  const { data, error } = await supabase
    .from("leads")
    .insert(lead)
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error("Failed to create lead");

  // Invalidar caches relacionados
  CacheManager.invalidateLeadsRelated();

  return data as Lead;
};

// Update lead - Public API with type safety
export const updateLead = async (id: string, updates: Partial<Lead>): Promise<Lead> => {
  // Cast query builder to any to bypass strict Supabase type checking
  const query: any = supabase.from("leads");
  
  const { data, error } = await query
    .update(updates as any)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error("Failed to update lead");

  // Invalidar caches relacionados
  CacheManager.invalidateLeadsRelated();

  return data as Lead;
};

// Delete lead
export const deleteLead = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("leads")
    .delete()
    .eq("id", id);

  if (error) throw error;

  // Invalidar caches relacionados
  CacheManager.invalidateLeadsRelated();
};

// Add interaction to lead
export const addLeadInteraction = async (
  interaction: InteractionInsert
): Promise<Interaction> => {
  const { data, error } = await supabase
    .from("interactions")
    .insert(interaction)
    .select()
    .single();

  if (error) throw error;

  // Use the any-typed update approach here as well to avoid issues
  const queryBuilder: any = supabase.from("leads");
  await queryBuilder
    .update({ last_contact_date: new Date().toISOString() })
    .eq("id", interaction.lead_id);

  return data;
};

// Get lead interactions
export const getLeadInteractions = async (leadId: string): Promise<Interaction[]> => {
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
  // Use any-typed query builder
  const queryBuilder: any = supabase.from("leads");
  
  const { data, error } = await queryBuilder
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Get leads by stage (for pipeline view)
export const getLeadsByStage = async (): Promise<Record<string, LeadWithDetails[]>> => {
  const leads = await getLeads();
  const stages = await getPipelineStages();

  const leadsByStage: Record<string, LeadWithDetails[]> = {};

  stages.forEach(stage => {
    leadsByStage[stage.name] = leads.filter(lead => lead.status === stage.name.toLowerCase().replace(/\s+/g, '_'));
  });

  return leadsByStage;
};

// Get lead statistics
export const getLeadStats = async () => {
  const { data, error } = await supabase
    .from("leads")
    .select("status, lead_type"); 

  if (error) throw error;

  const stats = {
    total: data.length,
    new: data.filter(l => l.status === "new").length,
    contacted: data.filter(l => l.status === "contacted").length,
    qualified: data.filter(l => l.status === "qualified").length,
    proposal: data.filter(l => l.status === "proposal").length,
    won: data.filter(l => l.status === "won").length,
    lost: data.filter(l => l.status === "lost").length,
    negotiation: data.filter(l => l.status === "negotiation").length,
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
  // Cast query builder to bypass type checking
  const query: any = supabase.from("leads");
  
  const { error } = await query
    .update({ assigned_to: userId })
    .eq("id", leadId);

  if (error) throw error;

  // Invalidar caches relacionados
  CacheManager.invalidateLeadsRelated();
};