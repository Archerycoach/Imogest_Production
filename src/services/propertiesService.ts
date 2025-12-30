import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Property = Database["public"]["Tables"]["properties"]["Row"];
type PropertyInsert = Database["public"]["Tables"]["properties"]["Insert"];
type PropertyUpdate = Database["public"]["Tables"]["properties"]["Update"];

// Add missing interfaces
export interface PropertyFilters {
  status?: string;
  property_type?: string;
  minPrice?: number;
  maxPrice?: number;
  city?: string;
  bedrooms?: number;
}

export type PropertyWithDetails = Property & {
  agent?: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
  } | null;
};

// Get all properties for current user
export const getProperties = async (filters?: PropertyFilters) => {
  let query = (supabase as any)
    .from("properties")
    .select(`
      *,
      agent:profiles!properties_user_id_fkey (
        full_name,
        email,
        phone,
        avatar_url
      )
    `)
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.property_type) {
    query = query.eq("property_type", filters.property_type);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching properties:", error);
    return [];
  }

  return (data as unknown) as PropertyWithDetails[];
};

// Get single property by ID
export const getProperty = async (id: string): Promise<Property | null> => {
  const { data, error } = await (supabase as any)
    .from("properties")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching property:", error);
    return null;
  }

  return data;
};

// Create new property
export const createProperty = async (property: PropertyInsert) => {
  const { data, error } = await (supabase as any)
    .from("properties")
    .insert({
      ...property,
      property_type: property.property_type as any,
      status: property.status as any
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Update property
export const updateProperty = async (id: string, updates: PropertyUpdate) => {
  const { data, error } = await (supabase as any)
    .from("properties")
    .update({
      ...updates,
      property_type: updates.property_type as any,
      status: updates.status as any
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Delete property
export const deleteProperty = async (id: string): Promise<void> => {
  const { error } = await (supabase as any)
    .from("properties")
    .delete()
    .eq("id", id);

  if (error) throw error;
};

// Search properties
export const searchProperties = async (query: string): Promise<Property[]> => {
  const { data, error } = await (supabase as any)
    .from("properties")
    .select("*")
    .or(`title.ilike.%${query}%,address.ilike.%${query}%,city.ilike.%${query}%`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error searching properties:", error);
    return [];
  }

  return data || [];
};

// Get properties by status
export const getPropertiesByStatus = async (status: string): Promise<Property[]> => {
  const { data, error } = await (supabase as any)
    .from("properties")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching properties by status:", error);
    return [];
  }

  return data || [];
};

// Get properties by type
export const getPropertiesByType = async (type: string): Promise<Property[]> => {
  const { data, error } = await (supabase as any)
    .from("properties")
    .select("*")
    .eq("type", type)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching properties by type:", error);
    return [];
  }

  return data || [];
};

// Upload property images
export const uploadPropertyImage = async (file: File, propertyId: string): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const fileExt = file.name.split(".").pop();
  const fileName = `${propertyId}-${Date.now()}.${fileExt}`;
  const filePath = `properties/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("property-images")
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from("property-images")
    .getPublicUrl(filePath);

  return publicUrl;
};