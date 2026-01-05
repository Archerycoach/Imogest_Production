import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log("🔵 [create-event] API called");
  
  if (req.method !== "POST") {
    console.log("❌ [create-event] Method not allowed:", req.method);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.authorization;
    console.log("🔑 [create-event] Auth header present:", !!authHeader);
    
    const token = authHeader?.replace("Bearer ", "");
    
    if (!token) {
      console.log("❌ [create-event] No token provided");
      return res.status(401).json({ error: "Not authenticated" });
    }

    console.log("🔑 [create-event] Token received, validating user...");
    // Get user from token using supabaseAdmin
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.log("❌ [create-event] User validation failed:", userError?.message);
      return res.status(401).json({ error: "Not authenticated" });
    }

    console.log("✅ [create-event] User authenticated:", user.id);

    // Get user's Google Calendar tokens
    console.log("🔍 [create-event] Fetching Google credentials...");
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from("user_integrations")
      .select("access_token, refresh_token, token_expiry, is_active")
      .eq("user_id", user.id)
      .eq("integration_type", "google_calendar")
      .eq("is_active", true)
      .single();

    if (integrationError || !integration) {
      console.log("❌ [create-event] Google Calendar not connected:", integrationError?.message);
      return res.status(400).json({ error: "Google Calendar not connected" });
    }

    console.log("✅ [create-event] Google credentials loaded");
    console.log("🔑 [create-event] Token expiry:", integration.token_expiry);
    console.log("📊 [create-event] Integration active:", integration.is_active);

    const { event } = req.body;
    console.log("📋 [create-event] Event data:", {
      summary: event?.summary,
      start: event?.start,
      end: event?.end,
      hasDescription: !!event?.description,
      hasLocation: !!event?.location,
      attendeesCount: event?.attendees?.length || 0
    });

    if (!event || !event.summary || !event.start || !event.end) {
      console.log("❌ [create-event] Invalid event data");
      return res.status(400).json({ error: "Invalid event data" });
    }

    console.log("🌐 [create-event] Calling Google Calendar API...");
    // Create event in Google Calendar
    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${integration.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: event.summary,
          description: event.description || "",
          location: event.location || "",
          start: {
            dateTime: event.start,
            timeZone: "Europe/Lisbon",
          },
          end: {
            dateTime: event.end,
            timeZone: "Europe/Lisbon",
          },
          attendees: event.attendees?.map((email: string) => ({ email })) || [],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("❌ [create-event] Google API error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      return res.status(response.status).json({ error: "Failed to create event in Google Calendar" });
    }

    const googleEvent = await response.json();
    console.log("✅ [create-event] Event created successfully in Google:", {
      id: googleEvent.id,
      htmlLink: googleEvent.htmlLink
    });

    res.json({ 
      success: true,
      googleEventId: googleEvent.id,
      htmlLink: googleEvent.htmlLink
    });
  } catch (error) {
    console.error("Error creating Google Calendar event:", error);
    res.status(500).json({ error: "Failed to create event in Google Calendar" });
  }
}