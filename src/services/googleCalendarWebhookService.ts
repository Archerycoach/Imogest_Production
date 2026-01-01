import { supabase } from "@/integrations/supabase/client";

/**
 * Google Calendar Webhook Management Service
 * 
 * Manages webhook subscriptions for Google Calendar push notifications.
 * Google Calendar will send notifications to our webhook when events change.
 */

interface WatchResponse {
  kind: string;
  id: string;
  resourceId: string;
  resourceUri: string;
  expiration: string;
}

/**
 * Register a webhook with Google Calendar to receive push notifications
 * 
 * @param accessToken Google OAuth access token
 * @param userId User ID to associate with this webhook
 * @returns Webhook channel information
 */
export async function registerGoogleCalendarWebhook(
  accessToken: string,
  userId: string
): Promise<WatchResponse | null> {
  try {
    // Get the webhook URL (must be HTTPS in production)
    const webhookUrl = getWebhookUrl();

    // Create a unique channel ID
    const channelId = `imogest-${userId}-${Date.now()}`;

    // Make request to Google Calendar API to watch for changes
    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events/watch",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: channelId,
          type: "web_hook",
          address: webhookUrl,
          token: userId, // We'll use this to identify the user
          expiration: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Failed to register webhook:", error);
      return null;
    }

    const data: WatchResponse = await response.json();

    // Store webhook information in database
    await storeWebhookInfo(userId, data);

    console.log("Webhook registered successfully:", data);
    return data;
  } catch (error) {
    console.error("Error registering webhook:", error);
    return null;
  }
}

/**
 * Stop receiving notifications from Google Calendar
 */
export async function stopGoogleCalendarWebhook(
  accessToken: string,
  channelId: string,
  resourceId: string
): Promise<boolean> {
  try {
    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/channels/stop",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: channelId,
          resourceId: resourceId,
        }),
      }
    );

    return response.ok;
  } catch (error) {
    console.error("Error stopping webhook:", error);
    return false;
  }
}

/**
 * Get the webhook URL for this application
 */
function getWebhookUrl(): string {
  // In production, this must be HTTPS
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}/api/google-calendar/webhook`;
}

/**
 * Store webhook information in database
 */
async function storeWebhookInfo(userId: string, webhook: WatchResponse) {
  try {
    // Store in user_integrations or a separate webhooks table
    const { error } = await supabase.from("user_integrations").update({
      webhook_channel_id: webhook.id,
      webhook_resource_id: webhook.resourceId,
      webhook_expiration: new Date(parseInt(webhook.expiration)).toISOString(),
    }).eq("user_id", userId).eq("integration_type", "google_calendar");

    if (error) {
      console.error("Error storing webhook info:", error);
    }
  } catch (error) {
    console.error("Error storing webhook info:", error);
  }
}

/**
 * Check if webhook needs renewal and renew if necessary
 */
export async function checkAndRenewWebhook(userId: string): Promise<boolean> {
  try {
    // Get webhook info from database
    const { data: integration } = await supabase
      .from("user_integrations")
      .select("*")
      .eq("user_id", userId)
      .eq("integration_type", "google_calendar")
      .single();

    if (!integration || !integration.webhook_expiration) {
      return false;
    }

    const expirationDate = new Date(integration.webhook_expiration);
    const now = new Date();
    const hoursUntilExpiration = (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Renew if less than 24 hours until expiration
    if (hoursUntilExpiration < 24) {
      console.log("Webhook expiring soon, renewing...");
      
      // Stop old webhook
      if (integration.webhook_channel_id && integration.webhook_resource_id) {
        await stopGoogleCalendarWebhook(
          integration.access_token,
          integration.webhook_channel_id,
          integration.webhook_resource_id
        );
      }

      // Register new webhook
      await registerGoogleCalendarWebhook(integration.access_token, userId);
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error checking/renewing webhook:", error);
    return false;
  }
}