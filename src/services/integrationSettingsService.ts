import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// Adapting to the existing table structure
// Table: integration_settings
// Columns: id, integration_name, is_active, settings (json), ...

export interface IntegrationConfig {
  id: string;
  service_name: string; // mapped from integration_name
  enabled: boolean; // mapped from is_active
  client_id?: string; // from settings json
  client_secret?: string; // from settings json
  scopes?: string[]; // from settings json
  redirect_uri?: string; // from settings json
}

export async function getIntegrationSettings(serviceName: string): Promise<IntegrationConfig | null> {
  const { data, error } = await supabase
    .from("integration_settings")
    .select("*")
    .eq("integration_name", serviceName)
    .maybeSingle();

  if (error) {
    console.error("Error fetching integration settings:", error);
    throw error;
  }

  if (!data) return null;

  const settings = data.settings as any;
  return {
    id: data.id,
    service_name: data.integration_name,
    enabled: data.is_active || false,
    client_id: settings?.client_id,
    client_secret: settings?.client_secret,
    scopes: settings?.scopes,
    redirect_uri: settings?.redirect_uri,
  };
}

export async function toggleIntegrationEnabled(
  serviceName: string,
  enabled: boolean
): Promise<void> {
  const { error } = await supabase
    .from("integration_settings")
    .update({ is_active: enabled })
    .eq("integration_name", serviceName);

  if (error) {
    console.error("Error toggling integration:", error);
    throw error;
  }
}