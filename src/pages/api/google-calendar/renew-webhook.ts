import type { NextApiRequest, NextApiResponse } from "next";
import { checkAndRenewWebhook } from "@/services/googleCalendarWebhookService";
import { supabase } from "@/integrations/supabase/client";

/**
 * Endpoint to check and renew Google Calendar webhooks
 * Can be called by a cron job to keep webhooks active
 * 
 * Usage: POST /api/google-calendar/renew-webhook
 * Body: { user_id: "xxx" } (optional, if not provided, renews for all users)
 */

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { user_id } = req.body;

    if (user_id) {
      // Renew for specific user
      const renewed = await checkAndRenewWebhook(user_id);
      return res.status(200).json({ 
        success: true, 
        renewed,
        message: renewed ? "Webhook renewed" : "Webhook still valid"
      });
    }

    // Renew for all users with Google Calendar connected
    const { data: integrations, error } = await supabase
      .from("user_integrations")
      .select("user_id")
      .eq("integration_type", "google_calendar")
      .eq("is_active", true);

    if (error) throw error;

    const results = await Promise.all(
      (integrations || []).map(async (integration) => {
        try {
          const renewed = await checkAndRenewWebhook(integration.user_id);
          return { user_id: integration.user_id, renewed, success: true };
        } catch (error: any) {
          return { 
            user_id: integration.user_id, 
            renewed: false, 
            success: false,
            error: error.message 
          };
        }
      })
    );

    const successCount = results.filter(r => r.success).length;
    const renewedCount = results.filter(r => r.renewed).length;

    return res.status(200).json({
      success: true,
      total: results.length,
      successful: successCount,
      renewed: renewedCount,
      results,
    });
  } catch (error: any) {
    console.error("Error renewing webhooks:", error);
    return res.status(500).json({ error: error.message });
  }
}