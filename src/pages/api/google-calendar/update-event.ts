import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("🔵 [update-event] API called");

    const { googleEventId, event } = req.body;

    if (!googleEventId || !event) {
      console.error("❌ [update-event] Missing required fields");
      return res.status(400).json({ error: "Missing googleEventId or event data" });
    }

    console.log("📋 [update-event] Updating Google event:", googleEventId);

    // Get auth token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("❌ [update-event] No authorization header");
      return res.status(401).json({ error: "Unauthorized" });
    }

    const accessToken = authHeader.replace("Bearer ", "");

    // Get user from token using supabaseAdmin
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(accessToken);
    if (userError || !user) {
      console.error("❌ [update-event] Invalid user token");
      return res.status(401).json({ error: "Invalid token" });
    }

    console.log("✅ [update-event] User authenticated:", user.id);

    // Get Google Calendar credentials
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from("user_integrations")
      .select("access_token, refresh_token, token_expiry, is_active")
      .eq("user_id", user.id)
      .eq("integration_type", "google_calendar")
      .maybeSingle();

    if (integrationError || !integration) {
      console.error("❌ [update-event] No Google credentials found");
      return res.status(400).json({ error: "Google Calendar not connected" });
    }

    console.log("✅ [update-event] Google credentials retrieved");

    // Update event in Google Calendar
    const googleResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`,
      {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${integration.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: event.summary,
          description: event.description,
          location: event.location,
          start: event.start,
          end: event.end,
        }),
      }
    );

    if (!googleResponse.ok) {
      const error = await googleResponse.text();
      console.error("❌ [update-event] Google API error:", error);
      return res.status(500).json({ error: "Failed to update Google Calendar event" });
    }

    const updatedEvent = await googleResponse.json();
    console.log("✅ [update-event] Google Calendar updated successfully");

    return res.status(200).json({
      success: true,
      event: updatedEvent,
    });

  } catch (error) {
    console.error("❌ [update-event] Error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}