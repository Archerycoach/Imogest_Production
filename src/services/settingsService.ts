import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type SystemSetting = Database["public"]["Tables"]["system_settings"]["Row"];

// Get all system settings
export const getAllSettings = async (): Promise<SystemSetting[]> => {
  const { data, error } = await supabase
    .from("system_settings")
    .select("*")
    .order("key");

  if (error) throw error;
  return data || [];
};

// Get specific setting by key
export const getSetting = async (key: string): Promise<SystemSetting | null> => {
  const { data, error } = await supabase
    .from("system_settings")
    .select("*")
    .eq("key", key)
    .maybeSingle();

  if (error) throw error;
  return data;
};

// Update or create setting
export const updateSetting = async (
  key: string,
  value: any,
  description?: string
): Promise<SystemSetting> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error("User not authenticated");

  const settingData = {
    key: key,
    value: value,
    description: description,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("system_settings")
    .upsert(settingData as any, { onConflict: "key" })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Get modules configuration
export const getModulesConfig = async () => {
  const setting = await getSetting("modules_enabled");
  return setting?.value || {
    leads: true,
    properties: true,
    tasks: true,
    calendar: true,
    reports: true,
    chat: true,
  };
};

// Update modules configuration
export const updateModulesConfig = async (modules: Record<string, boolean>) => {
  return updateSetting(
    "modules_enabled",
    modules,
    "Enabled/disabled modules"
  );
};

// Get pipeline stages configuration
export const getPipelineConfig = async () => {
  const setting = await getSetting("pipeline_stages");
  return setting?.value || {
    buyer: ["novo", "contactado", "qualificado", "visitas", "seguimento", "negociacao", "proposta", "fechado", "perdido"],
    seller: ["novo", "contactado", "avaliacao", "seguimento", "negociacao", "listado", "vendido", "perdido"],
  };
};

// Update pipeline stages configuration
export const updatePipelineConfig = async (stages: Record<string, string[]>) => {
  return updateSetting(
    "pipeline_stages",
    stages,
    "Pipeline stages configuration"
  );
};

// Get required fields configuration
export const getRequiredFieldsConfig = async () => {
  const setting = await getSetting("required_fields");
  return setting?.value || {
    leads: ["name", "email", "type"],
    properties: ["title", "type", "price"],
    tasks: ["title", "due_date"],
  };
};

// Update required fields configuration
export const updateRequiredFieldsConfig = async (fields: Record<string, string[]>) => {
  return updateSetting(
    "required_fields",
    fields,
    "Required fields by module"
  );
};

// Get security settings
export const getSecuritySettings = async () => {
  const setting = await getSetting("security_settings");
  return setting?.value || {
    require_2fa: false,
    session_timeout: 3600,
    password_min_length: 8,
    max_login_attempts: 5,
  };
};

// Update security settings
export const updateSecuritySettings = async (settings: Record<string, any>) => {
  return updateSetting(
    "security_settings",
    settings,
    "Security configuration"
  );
};

// Get Google Calendar configuration from integration_settings
export const getGoogleCalendarConfig = async () => {
  const { data, error } = await supabase
    .from("integration_settings")
    .select("settings")
    .eq("integration_name", "google_calendar")
    .maybeSingle();

  if (error) throw error;
  
  // Cast settings to any to access properties safely
  const settings = data?.settings as any || {};
  
  return {
    clientId: settings.clientId || "",
    clientSecret: settings.clientSecret || "",
    redirectUri: settings.redirectUri || "",
  };
};

// Update Google Calendar configuration in integration_settings
export const updateGoogleCalendarConfig = async (config: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error("User not authenticated");

  // Check if integration exists first
  const { data: existing } = await supabase
    .from("integration_settings")
    .select("id")
    .eq("integration_name", "google_calendar")
    .maybeSingle();

  const settingData = {
    integration_name: "google_calendar",
    settings: config,
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("integration_settings")
    .upsert(settingData, { onConflict: "integration_name" })
    .select()
    .single();

  if (error) throw error;
  return data;
};