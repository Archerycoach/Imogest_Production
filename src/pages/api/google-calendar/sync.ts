import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("🔄 [sync] Starting Google Calendar sync...");

    // Get auth token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("❌ [sync] No authorization header");
      return res.status(401).json({ error: "Unauthorized" });
    }

    const accessToken = authHeader.replace("Bearer ", "");

    // Get user from token using supabaseAdmin (bypasses RLS issues if any, but getUser verifies token)
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(accessToken);
    if (userError || !user) {
      console.error("❌ [sync] Invalid user token:", userError);
      return res.status(401).json({ error: "Invalid token" });
    }

    console.log("✅ [sync] User authenticated:", user.id);

    // Get Google Calendar credentials
    // Using supabaseAdmin to ensure we can read user_integrations even if RLS is strict
    const { data: credentials, error: credError } = await supabaseAdmin
      .from("user_integrations")
      .select("access_token, refresh_token, token_expiry, is_active")
      .eq("user_id", user.id)
      .eq("integration_type", "google_calendar")
      .maybeSingle();

    if (credError) {
      console.error("❌ [sync] Error fetching credentials:", credError);
      return res.status(400).json({ error: "Failed to fetch Google Calendar credentials" });
    }

    if (!credentials) {
      console.error("❌ [sync] No Google credentials found for user:", user.id);
      return res.status(400).json({ error: "Google Calendar not connected. Please connect in /admin/integrations" });
    }

    if (!credentials.is_active) {
      console.error("❌ [sync] Google Calendar integration is inactive for user:", user.id);
      return res.status(400).json({ error: "Google Calendar is inactive. Please reconnect in /admin/integrations" });
    }

    console.log("✅ [sync] Google credentials retrieved and active");

    // Check if token is expired
    const now = new Date();
    const expiryDate = new Date(credentials.token_expiry);
    
    if (expiryDate <= now) {
      console.log("⚠️ [sync] Token expired, refreshing...");
      // TODO: Implement token refresh mechanism here if needed
      // For now, ask user to reconnect
      return res.status(401).json({ error: "Token expired, please reconnect Google Calendar" });
    }

    // Fetch events from Google Calendar
    const timeMin = new Date();
    timeMin.setMonth(timeMin.getMonth() - 1); // Last month
    const timeMax = new Date();
    timeMax.setMonth(timeMax.getMonth() + 3); // Next 3 months

    console.log("📅 [sync] Fetching Google events from", timeMin, "to", timeMax);

    const googleResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${timeMin.toISOString()}&` +
      `timeMax=${timeMax.toISOString()}&` +
      `singleEvents=true&` +
      `orderBy=startTime`,
      {
        headers: {
          Authorization: `Bearer ${credentials.access_token}`,
        },
      }
    );

    if (!googleResponse.ok) {
      const error = await googleResponse.text();
      console.error("❌ [sync] Google API error:", error);
      return res.status(500).json({ error: "Failed to fetch Google Calendar events" });
    }

    const googleData = await googleResponse.json();
    const googleEvents = googleData.items || [];

    console.log("📊 [sync] Google events fetched:", googleEvents.length);

    // Get existing events from database
    const { data: existingEventsData } = await supabaseAdmin
      .from("calendar_events")
      .select("id, google_event_id, start_time, title, description")
      .eq("user_id", user.id)
      .not("google_event_id", "is", null);
      
    const existingEvents: any[] = existingEventsData || [];

    console.log("📊 [sync] Existing synced events in DB:", existingEvents.length);

    // Map existing events by Google ID for updates
    const existingEventsMap = new Map(
      existingEvents.map((e) => [e.google_event_id, e])
    );

    let imported = 0;
    let updated = 0;
    let skipped = 0;

    // Process each Google event
    for (const gEvent of googleEvents) {
      const googleEventId = gEvent.id;
      const summary = gEvent.summary || "Untitled Event";
      const description = gEvent.description || "";
      const location = gEvent.location || "";
      
      // Handle all-day events and timed events
      const startTime = gEvent.start?.dateTime || gEvent.start?.date;
      const endTime = gEvent.end?.dateTime || gEvent.end?.date;

      if (!startTime) {
        console.log("⚠️ [sync] Skipping event without start time:", googleEventId);
        skipped++;
        continue;
      }

      // Check if event already exists
      const existingEvent = existingEventsMap.get(googleEventId);

      if (existingEvent) {
        // Event exists - check if it needs updating
        const needsUpdate = 
          existingEvent.title !== summary ||
          existingEvent.description !== description ||
          new Date(existingEvent.start_time).getTime() !== new Date(startTime).getTime();

        if (needsUpdate) {
          console.log("🔄 [sync] Updating existing event:", googleEventId);
          
          const { error: updateError } = await supabaseAdmin
            .from("calendar_events")
            .update({
              title: summary,
              description: description,
              location: location,
              start_time: startTime,
              end_time: endTime,
              is_synced: true,
            })
            .eq("id", existingEvent.id);

          if (updateError) {
            console.error("❌ [sync] Error updating event:", updateError);
          } else {
            console.log("✅ [sync] Event updated:", existingEvent.id);
            updated++;
          }
        } else {
          console.log("ℹ️ [sync] Event unchanged, skipping:", googleEventId);
          skipped++;
        }
      } else {
        // New event - import it
        console.log("➕ [sync] Importing new event:", googleEventId);

        const { error: insertError } = await supabaseAdmin
          .from("calendar_events")
          .insert({
            user_id: user.id,
            title: summary,
            description: description,
            location: location,
            start_time: startTime,
            end_time: endTime,
            google_event_id: googleEventId,
            is_synced: true,
            event_type: "other",
            attendees: gEvent.attendees?.map((a: any) => a.email) || [],
          });

        if (insertError) {
          console.error("❌ [sync] Error importing event:", insertError);
          skipped++;
        } else {
          console.log("✅ [sync] Event imported:", googleEventId);
          imported++;
        }
      }
    }

    console.log("✅ [sync] Sync completed:", { imported, updated, skipped, total: googleEvents.length });

    return res.status(200).json({
      success: true,
      imported,
      updated,
      skipped,
      total: googleEvents.length,
    });

  } catch (error) {
    console.error("❌ [sync] Sync error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}