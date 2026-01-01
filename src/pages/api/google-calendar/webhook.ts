import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/integrations/supabase/client";

/**
 * Google Calendar Push Notifications Webhook
 * 
 * This endpoint receives notifications from Google Calendar when events change.
 * Google Calendar will POST to this endpoint when:
 * - An event is created
 * - An event is updated
 * - An event is deleted
 * 
 * Setup required:
 * 1. Register this webhook URL with Google Calendar API (watch endpoint)
 * 2. Google will send a verification request first
 * 3. Then it will send notifications when events change
 * 
 * Documentation: https://developers.google.com/calendar/api/guides/push
 */

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only accept POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get notification headers from Google
    const channelId = req.headers["x-goog-channel-id"] as string;
    const resourceState = req.headers["x-goog-resource-state"] as string;
    const resourceId = req.headers["x-goog-resource-id"] as string;
    const channelToken = req.headers["x-goog-channel-token"] as string;

    console.log("Google Calendar webhook received:", {
      channelId,
      resourceState,
      resourceId,
      channelToken,
    });

    // Handle different resource states
    switch (resourceState) {
      case "sync":
        // Initial verification request from Google
        console.log("Google Calendar webhook sync verification");
        return res.status(200).json({ success: true, message: "Webhook verified" });

      case "exists":
        // Event exists (created or updated)
        console.log("Google Calendar event exists notification");
        await handleEventChange(channelToken);
        return res.status(200).json({ success: true, message: "Event synced" });

      case "not_exists":
        // Event was deleted
        console.log("Google Calendar event deleted notification");
        await handleEventChange(channelToken);
        return res.status(200).json({ success: true, message: "Event deleted" });

      default:
        console.log("Unknown resource state:", resourceState);
        return res.status(200).json({ success: true });
    }
  } catch (error: any) {
    console.error("Error processing Google Calendar webhook:", error);
    // Always return 200 to Google to avoid retries
    return res.status(200).json({ error: error.message });
  }
}

/**
 * Handle event change notification
 * Triggers a full sync for the user associated with this channel
 */
async function handleEventChange(channelToken: string) {
  try {
    // Extract user_id from channel token (we'll include it when creating the watch)
    const userId = channelToken;

    if (!userId) {
      console.error("No user ID in channel token");
      return;
    }

    // Import events from Google Calendar for this user
    // We'll implement incremental sync here
    console.log(`Triggering sync for user: ${userId}`);

    // For now, just log it
    // In production, you'd queue a background job to sync
    // or call the sync function directly if it's fast enough

    // Example:
    // await importGoogleCalendarEventsForUser(userId);
  } catch (error) {
    console.error("Error handling event change:", error);
  }
}