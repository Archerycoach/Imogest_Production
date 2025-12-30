import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// Force types to match what we expect from the DB
type Contact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  avatar_url: string | null;
};

export const getContacts = async () => {
  // Fetch from profiles as contacts
  const { data, error } = await supabase
    .from("profiles")
    .select("*");

  if (error) {
    console.error("Error fetching contacts:", error);
    return [];
  }
  
  // Map profiles to contacts
  return data.map((profile: any) => ({
    id: profile.id,
    name: profile.full_name || profile.email || "Sem Nome",
    email: profile.email,
    phone: profile.phone,
    role: profile.role,
    avatar_url: profile.avatar_url
  })) as Contact[];
};

export const searchContacts = async (query: string): Promise<Contact[]> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`);

  if (error) {
    console.error("Error searching contacts:", error);
    return [];
  }

  return data.map((profile: any) => ({
    id: profile.id,
    name: profile.full_name || profile.email || "Sem Nome",
    email: profile.email,
    phone: profile.phone,
    role: profile.role,
    avatar_url: profile.avatar_url
  })) as Contact[];
};

export const createContact = async (contact: any) => {
  // Contacts are essentially profiles in this system, but we might not allow creating profiles directly via this service
  // depending on auth flow. Assuming this creates a lead or just fails gracefully for now, or creates a profile if using admin rights.
  // For safety, let's map it to creating a lead with type 'contact' if that existed, but since it's profiles:
  
  console.warn("Creating contacts directly is restricted to auth registration.");
  return null;
};

export const updateContact = async (id: string, updates: any) => {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteContact = async (id: string) => {
  // Soft delete usually, or real delete if admin
  const { error } = await supabase
    .from("profiles")
    .delete()
    .eq("id", id);

  if (error) throw error;
  return true;
};