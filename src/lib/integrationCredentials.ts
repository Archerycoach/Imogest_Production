import { supabase } from "@/integrations/supabase/client";

// Generic function to get integration credentials from database
export const getIntegrationCredentials = async (integrationName: string) => {
  const { data, error } = await supabase
    .from("integration_settings")
    .select("settings, is_active")
    .eq("integration_name", integrationName)
    .single();

  if (error || !data) {
    console.error(`Failed to fetch ${integrationName} credentials:`, error);
    return null;
  }

  if (!data.is_active) {
    console.warn(`${integrationName} integration is not active`);
    return null;
  }

  return data.settings;
};

// SendGrid credentials
export const getSendGridCredentials = async () => {
  const settings = await getIntegrationCredentials("sendgrid") as any;
  return {
    apiKey: settings?.api_key || "",
    fromEmail: settings?.from_email || "",
    fromName: settings?.from_name || "",
  };
};

// Twilio credentials
export const getTwilioCredentials = async () => {
  const settings = await getIntegrationCredentials("twilio") as any;
  return {
    accountSid: settings?.account_sid || "",
    authToken: settings?.auth_token || "",
    phoneNumber: settings?.phone_number || "",
  };
};

// WhatsApp credentials
export const getWhatsAppCredentials = async () => {
  const settings = await getIntegrationCredentials("whatsapp") as any;
  return {
    phoneNumberId: settings?.phone_number_id || "",
    accessToken: settings?.access_token || "",
    businessAccountId: settings?.business_account_id || "",
    webhookVerifyToken: settings?.webhook_verify_token || "",
  };
};

// Google Maps credentials
export const getGoogleMapsCredentials = async () => {
  const settings = await getIntegrationCredentials("google_maps") as any;
  return {
    apiKey: settings?.api_key || "",
  };
};

// Google Calendar credentials
export const getGoogleCalendarCredentials = async () => {
  const settings = await getIntegrationCredentials("google_calendar") as any;
  return {
    clientId: settings?.clientId || "",
    clientSecret: settings?.clientSecret || "",
  };
};

// Stripe credentials
export const getStripeCredentials = async () => {
  const settings = await getIntegrationCredentials("stripe") as any;
  return {
    secretKey: settings?.secret_key || "",
    publishableKey: settings?.publishable_key || "",
    webhookSecret: settings?.webhook_secret || "",
  };
};

// Eupago credentials
export const getEupagoCredentials = async () => {
  const settings = await getIntegrationCredentials("eupago") as any;
  return {
    apiKey: settings?.api_key || "",
  };
};