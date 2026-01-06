import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type IntegrationSettingRow = Database["public"]["Tables"]["integration_settings"]["Row"];

export interface IntegrationSettings {
  id: string;
  integration_name: string;
  settings: Record<string, any>;
  is_active: boolean;
  last_tested_at: string | null;
  test_status: "success" | "failed" | "pending" | "not_tested";
  test_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface IntegrationConfig {
  name: string;
  displayName: string;
  description: string;
  icon: string;
  color: string;
  fields: IntegrationField[];
  docsUrl: string;
  testEndpoint?: string;
}

export interface IntegrationField {
  key: string;
  label: string;
  type: "text" | "password" | "url" | "email";
  placeholder: string;
  helpText?: string;
  required: boolean;
}

// Integration configurations
export const INTEGRATIONS: Record<string, IntegrationConfig> = {
  google_calendar: {
    name: "google_calendar",
    displayName: "Google Calendar",
    description: "Sincronize eventos do CRM com Google Calendar automaticamente",
    icon: "Calendar",
    color: "bg-blue-500",
    fields: [
      {
        key: "clientId",
        label: "Client ID",
        type: "text",
        required: true,
        placeholder: "xxx.apps.googleusercontent.com",
        helpText: "OAuth 2.0 Client ID do Google Cloud Console",
      },
      {
        key: "clientSecret",
        label: "Client Secret",
        type: "password",
        required: true,
        placeholder: "GOCSPX-xxx",
        helpText: "OAuth 2.0 Client Secret do Google Cloud Console",
      },
      {
        key: "redirectUri",
        label: "Redirect URI",
        type: "text",
        required: true,
        placeholder: "https://seudominio.com/api/google-calendar/callback",
        helpText: "URI de redirecionamento OAuth (auto-preenchido)",
      },
    ],
    testEndpoint: "/api/integrations/test-google-calendar",
    docsUrl: "https://console.cloud.google.com/apis/credentials",
  },
  gmail: {
    name: "gmail",
    displayName: "Gmail Integration",
    description: "Permite que os utilizadores conectem suas contas Gmail para envio de emails",
    icon: "Mail",
    color: "bg-red-500",
    fields: [
      {
        key: "clientId",
        label: "Client ID",
        type: "text",
        required: true,
        placeholder: "xxx.apps.googleusercontent.com",
        helpText: "OAuth 2.0 Client ID do Google Cloud Console",
      },
      {
        key: "clientSecret",
        label: "Client Secret",
        type: "password",
        required: true,
        placeholder: "GOCSPX-xxx",
        helpText: "OAuth 2.0 Client Secret do Google Cloud Console",
      },
      {
        key: "redirectUri",
        label: "Redirect URI",
        type: "text",
        required: true,
        placeholder: "https://seudominio.com/api/gmail/callback",
        helpText: "Adicione este URI nas credenciais do Google Cloud Console",
      },
    ],
    testEndpoint: "/api/integrations/test-gmail-connection",
    docsUrl: "https://developers.google.com/gmail/api/guides/sending",
  },
  stripe: {
    name: "stripe",
    displayName: "Stripe",
    description: "Pagamentos por cartão de crédito/débito",
    icon: "CreditCard",
    color: "bg-purple-500",
    docsUrl: "https://stripe.com/docs/api",
    testEndpoint: "/api/integrations/test-stripe",
    fields: [
      {
        key: "publishableKey",
        label: "Publishable Key",
        type: "text",
        placeholder: "pk_live_xxxxx...",
        helpText: "Chave pública para frontend",
        required: true,
      },
      {
        key: "secretKey",
        label: "Secret Key",
        type: "password",
        placeholder: "sk_live_xxxxx...",
        helpText: "Chave secreta para backend",
        required: true,
      },
      {
        key: "webhookSecret",
        label: "Webhook Secret",
        type: "password",
        placeholder: "whsec_xxxxx...",
        helpText: "Segredo para validar webhooks",
        required: false,
      },
    ],
  },
  eupago: {
    name: "eupago",
    displayName: "EuPago",
    description: "Multibanco e MB WAY - Pagamentos em Portugal",
    icon: "Landmark",
    color: "bg-orange-500",
    docsUrl: "https://eupago.pt/documentacao",
    testEndpoint: "/api/integrations/test-eupago",
    fields: [
      {
        key: "apiKey",
        label: "API Key",
        type: "password",
        placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        helpText: "Chave API da EuPago",
        required: true,
      },
      {
        key: "webhookKey",
        label: "Webhook Key",
        type: "password",
        placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        helpText: "Chave para validar notificações de pagamento",
        required: false,
      },
    ],
  },
  google_maps: {
    name: "google_maps",
    displayName: "Google Maps",
    description: "Mapas e localização de imóveis",
    icon: "MapPin",
    color: "bg-red-500",
    docsUrl: "https://developers.google.com/maps",
    testEndpoint: "/api/integrations/test-google-maps",
    fields: [
      {
        key: "apiKey",
        label: "API Key",
        type: "password",
        placeholder: "AIzaSyXxxxx...",
        helpText: "Chave API do Google Maps Platform",
        required: true,
      },
    ],
  },
  whatsapp: {
    name: "whatsapp",
    displayName: "WhatsApp Business API",
    description: "Envio de mensagens via WhatsApp Business",
    icon: "MessageCircle",
    color: "bg-green-500",
    docsUrl: "https://developers.facebook.com/docs/whatsapp",
    testEndpoint: "/api/integrations/test-whatsapp",
    fields: [
      {
        key: "phoneNumberId",
        label: "Phone Number ID",
        type: "text",
        placeholder: "123456789012345",
        helpText: "ID do número WhatsApp Business (Meta Business Suite)",
        required: true,
      },
      {
        key: "accessToken",
        label: "Access Token",
        type: "password",
        placeholder: "EAAT...",
        helpText: "Token permanente da Facebook Graph API",
        required: true,
      },
    ],
  },
};

// Get all integrations
export const getAllIntegrations = async (): Promise<IntegrationSettings[]> => {
  try {
    const { data, error } = await supabase
      .from("integration_settings")
      .select("*")
      .order("integration_name");

    if (error) throw error;
    
    return (data as IntegrationSettingRow[]).map(item => ({
      id: item.id,
      integration_name: item.integration_name,
      settings: (item.settings as Record<string, any>) || {},
      is_active: item.is_active || false,
      last_tested_at: item.last_tested_at,
      test_status: (item.test_status as any) || "not_tested",
      test_message: item.test_message,
      created_at: item.created_at,
      updated_at: item.updated_at
    }));
  } catch (error: any) {
    // Handle auth session errors gracefully
    if (error.message?.includes("Auth session missing")) {
      console.warn("No auth session available for integrations");
      return [];
    }
    throw error;
  }
};

// Get specific integration
export const getIntegration = async (name: string): Promise<IntegrationSettings | null> => {
  const { data, error } = await supabase
    .from("integration_settings")
    .select("*")
    .eq("integration_name", name)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    ...data,
    settings: data.settings as Record<string, any>
  } as IntegrationSettings;
};

// Update integration settings
export const updateIntegrationSettings = async (
  integration: string,
  settings: Record<string, any>
) => {
  try {
    // First, check if integration exists
    const { data: existingData } = await supabase
      .from("integration_settings")
      .select("*")
      .eq("integration_name", integration)
      .maybeSingle();

    let result;
    
    if (existingData) {
      // Update existing integration
      result = await supabase
        .from("integration_settings")
        .update({
          settings: settings,
          updated_at: new Date().toISOString(),
        })
        .eq("integration_name", integration)
        .select()
        .maybeSingle();
    } else {
      // Insert new integration
      result = await supabase
        .from("integration_settings")
        .insert({
          integration_name: integration,
          settings: settings,
          is_active: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .maybeSingle();
    }

    if (result.error) throw result.error;
    
    return result.data;
  } catch (error) {
    console.error(`Error updating ${integration} settings:`, error);
    throw error;
  }
};

// Toggle integration active status
export const toggleIntegrationStatus = async (
  integration: string,
  isActive: boolean
) => {
  const { data, error } = await supabase
    .from("integration_settings")
    .update({ 
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("integration_name", integration)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Test integration
export const testIntegration = async (name: string): Promise<{ success: boolean; message: string }> => {
  const integration = INTEGRATIONS[name];
  if (!integration?.testEndpoint) {
    return { success: false, message: "Teste não disponível para esta integração" };
  }

  try {
    const response = await fetch(integration.testEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const result = await response.json();

    // Update test status
    await supabase
      .from("integration_settings")
      .update({
        test_status: result.success ? "success" : "failed",
        test_message: result.message,
        last_tested_at: new Date().toISOString(),
      })
      .eq("integration_name", name);

    return result;
  } catch (error: any) {
    const errorMessage = error.message || "Erro ao testar integração";

    await supabase
      .from("integration_settings")
      .update({
        test_status: "failed",
        test_message: errorMessage,
        last_tested_at: new Date().toISOString(),
      })
      .eq("integration_name", name);

    return { success: false, message: errorMessage };
  }
};

// Sync integration to Supabase secrets (Edge Functions)
export const syncToSupabaseSecrets = async (integrationName: string): Promise<void> => {
  try {
    // Get current session token
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error("No active session");
    }

    const response = await fetch("/api/admin/sync-integration-secrets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ integration_name: integrationName }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to sync secrets");
    }

    const result = await response.json();
    console.log(`Secrets synced for ${integrationName}:`, result);
  } catch (error) {
    console.error("Error syncing secrets to Supabase:", error);
    throw error;
  }
};