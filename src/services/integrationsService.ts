import { supabase } from "@/integrations/supabase/client";

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
  whatsapp: {
    name: "whatsapp",
    displayName: "WhatsApp Business",
    description: "Envio de mensagens automáticas e notificações via WhatsApp",
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
        helpText: "ID do número de telefone da WhatsApp Business API",
        required: true,
      },
      {
        key: "accessToken",
        label: "Access Token",
        type: "password",
        placeholder: "EAAxxxxxxxxxx...",
        helpText: "Token de acesso permanente da Facebook Graph API",
        required: true,
      },
    ],
  },
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
    ],
    testEndpoint: "/api/integrations/test-google-calendar",
    docsUrl: "https://console.cloud.google.com/apis/credentials",
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
  sendgrid: {
    name: "sendgrid",
    displayName: "SendGrid",
    description: "Envio de emails transacionais e marketing",
    icon: "Mail",
    color: "bg-blue-600",
    docsUrl: "https://sendgrid.com/docs",
    testEndpoint: "/api/integrations/test-sendgrid",
    fields: [
      {
        key: "apiKey",
        label: "API Key",
        type: "password",
        placeholder: "SG.xxxxx...",
        helpText: "Chave API do SendGrid",
        required: true,
      },
      {
        key: "fromEmail",
        label: "Email Remetente",
        type: "email",
        placeholder: "noreply@seudominio.com",
        helpText: "Email verificado no SendGrid",
        required: true,
      },
      {
        key: "fromName",
        label: "Nome Remetente",
        type: "text",
        placeholder: "Imogest",
        helpText: "Nome que aparece como remetente",
        required: false,
      },
    ],
  },
  twilio: {
    name: "twilio",
    displayName: "Twilio",
    description: "SMS e chamadas telefónicas",
    icon: "Phone",
    color: "bg-red-600",
    docsUrl: "https://www.twilio.com/docs",
    testEndpoint: "/api/integrations/test-twilio",
    fields: [
      {
        key: "accountSid",
        label: "Account SID",
        type: "text",
        placeholder: "ACxxxxx...",
        helpText: "SID da conta Twilio",
        required: true,
      },
      {
        key: "authToken",
        label: "Auth Token",
        type: "password",
        placeholder: "xxxxx...",
        helpText: "Token de autenticação",
        required: true,
      },
      {
        key: "phoneNumber",
        label: "Número de Telefone",
        type: "text",
        placeholder: "+351912345678",
        helpText: "Número Twilio para envio de SMS",
        required: true,
      },
    ],
  },
  firebase: {
    name: "firebase",
    displayName: "Firebase",
    description: "Push notifications e analytics (opcional)",
    icon: "Bell",
    color: "bg-yellow-500",
    docsUrl: "https://firebase.google.com/docs",
    fields: [
      {
        key: "projectId",
        label: "Project ID",
        type: "text",
        placeholder: "meu-projeto-123",
        helpText: "ID do projeto Firebase",
        required: true,
      },
      {
        key: "apiKey",
        label: "API Key",
        type: "password",
        placeholder: "AIzaSyXxxxx...",
        helpText: "Chave API web do Firebase",
        required: true,
      },
      {
        key: "messagingSenderId",
        label: "Messaging Sender ID",
        type: "text",
        placeholder: "123456789012",
        helpText: "ID do remetente de mensagens",
        required: true,
      },
    ],
  },
};

// Get all integrations
export const getAllIntegrations = async (): Promise<IntegrationSettings[]> => {
  const { data, error } = await supabase
    .from("integration_settings")
    .select("*")
    .order("integration_name");

  if (error) throw error;
  
  return (data as any[]).map(item => ({
    ...item,
    settings: item.settings as Record<string, any>
  })) || [];
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
      .single();

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
        .single();
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
        .single();
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
export const syncToSupabaseSecrets = async (name: string): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch("/api/admin/sync-integration-secrets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ integrationName: name }),
    });

    const result = await response.json();
    return result;
  } catch (error: any) {
    return { success: false, message: error.message || "Erro ao sincronizar secrets" };
  }
};