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
    console.log("🔄 [sync] Starting bidirectional Google Calendar sync...");

    // Get auth token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("❌ [sync] No authorization header");
      return res.status(401).json({ error: "Unauthorized" });
    }

    const accessToken = authHeader.replace("Bearer ", "");

    // Get user from token
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(accessToken);
    if (userError || !user) {
      console.error("❌ [sync] Invalid user token:", userError);
      return res.status(401).json({ error: "Invalid token" });
    }

    console.log("✅ [sync] User authenticated:", user.id);

    // Get Google Calendar credentials
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
      return res.status(400).json({ error: "Google Calendar not connected" });
    }

    if (!credentials.is_active) {
      console.error("❌ [sync] Google Calendar integration is inactive");
      return res.status(400).json({ error: "Google Calendar is inactive" });
    }

    console.log("✅ [sync] Google credentials retrieved and active");

    // Check if token is expired
    const now = new Date();
    const expiryDate = new Date(credentials.token_expiry);
    
    if (expiryDate <= now) {
      console.log("⚠️ [sync] Token expired, please reconnect");
      return res.status(401).json({ error: "Token expired, please reconnect Google Calendar" });
    }

    // ===========================================================
    // STEP 1: SYNC FROM GOOGLE → APP (Import/Update/Delete)
    // ===========================================================
    
    const timeMin = new Date();
    timeMin.setMonth(timeMin.getMonth() - 1);
    const timeMax = new Date();
    timeMax.setMonth(timeMax.getMonth() + 3);

    console.log("📅 [sync] Fetching Google events from", timeMin.toISOString(), "to", timeMax.toISOString());

    const googleResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${timeMin.toISOString()}&` +
      `timeMax=${timeMax.toISOString()}&` +
      `singleEvents=true&` +
      `orderBy=startTime&` +
      `showDeleted=false`,
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
      .select("id, google_event_id, start_time, title, description, updated_at")
      .eq("user_id", user.id)
      .not("google_event_id", "is", null);
      
    const existingEvents: any[] = existingEventsData || [];

    console.log("📊 [sync] Existing synced events in DB:", existingEvents.length);

    // Create maps for efficient lookup
    const existingEventsMap = new Map(
      existingEvents.map((e) => [e.google_event_id, e])
    );
    
    const googleEventIdsSet = new Set(
      googleEvents.map((e: any) => e.id)
    );

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    let deleted = 0;

    // IMPORT/UPDATE events from Google
    for (const gEvent of googleEvents) {
      const googleEventId = gEvent.id;
      const summary = gEvent.summary || "Untitled Event";
      const description = gEvent.description || "";
      const location = gEvent.location || "";
      
      const startTime = gEvent.start?.dateTime || gEvent.start?.date;
      const endTime = gEvent.end?.dateTime || gEvent.end?.date;

      if (!startTime) {
        console.log("⚠️ [sync] Skipping event without start time:", googleEventId);
        skipped++;
        continue;
      }

      const existingEvent = existingEventsMap.get(googleEventId);

      if (existingEvent) {
        // Check if event needs updating
        const googleUpdated = new Date(gEvent.updated || 0);
        const localUpdated = new Date(existingEvent.updated_at || 0);

        if (googleUpdated > localUpdated) {
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
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingEvent.id);

          if (updateError) {
            console.error("❌ [sync] Error updating event:", updateError);
          } else {
            console.log("✅ [sync] Event updated:", existingEvent.id);
            updated++;
          }
        } else {
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

    // DELETE events that were removed from Google
    for (const existingEvent of existingEvents) {
      if (!googleEventIdsSet.has(existingEvent.google_event_id)) {
        console.log("🗑️ [sync] Deleting event removed from Google:", existingEvent.google_event_id);
        
        const { error: deleteError } = await supabaseAdmin
          .from("calendar_events")
          .delete()
          .eq("id", existingEvent.id);

        if (deleteError) {
          console.error("❌ [sync] Error deleting event:", deleteError);
        } else {
          console.log("✅ [sync] Event deleted:", existingEvent.id);
          deleted++;
        }
      }
    }

    console.log("✅ [sync] Google → App sync completed:", { imported, updated, deleted, skipped });

    // ===========================================================
    // STEP 2: SYNC FROM APP → GOOGLE (Export new events)
    // ===========================================================

    console.log("📤 [sync] Checking for local events to export to Google...");

    // Get local events that are not synced to Google yet
    const { data: localEvents, error: localError } = await supabaseAdmin
      .from("calendar_events")
      .select("id, title, description, location, start_time, end_time, attendees")
      .eq("user_id", user.id)
      .is("google_event_id", null)
      .gte("start_time", timeMin.toISOString())
      .lte("start_time", timeMax.toISOString());

    if (localError) {
      console.error("❌ [sync] Error fetching local events:", localError);
    }

    let exported = 0;
    const localEventsToSync = localEvents || [];

    console.log("📊 [sync] Local events to export:", localEventsToSync.length);

    for (const localEvent of localEventsToSync) {
      try {
        console.log("📤 [sync] Exporting local event to Google:", localEvent.title);

        // Create event in Google Calendar
        const googleEventData = {
          summary: localEvent.title,
          description: localEvent.description || "",
          location: localEvent.location || "",
          start: {
            dateTime: localEvent.start_time,
            timeZone: "Europe/Lisbon",
          },
          end: {
            dateTime: localEvent.end_time,
            timeZone: "Europe/Lisbon",
          },
          attendees: localEvent.attendees?.map((email: string) => ({ email })) || [],
        };

        const createResponse = await fetch(
          "https://www.googleapis.com/calendar/v3/calendars/primary/events",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${credentials.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(googleEventData),
          }
        );

        if (createResponse.ok) {
          const createdEvent = await createResponse.json();
          console.log("✅ [sync] Event exported to Google:", createdEvent.id);

          // Update local event with Google ID
          await supabaseAdmin
            .from("calendar_events")
            .update({
              google_event_id: createdEvent.id,
              is_synced: true,
            })
            .eq("id", localEvent.id);

          exported++;
        } else {
          const errorText = await createResponse.text();
          console.error("❌ [sync] Failed to export event to Google:", errorText);
        }
      } catch (exportError) {
        console.error("❌ [sync] Error exporting event:", exportError);
      }
    }

    console.log("✅ [sync] App → Google sync completed. Exported:", exported);

    // ===========================================================
    // FINAL RESULTS
    // ===========================================================

    console.log("🎉 [sync] Bidirectional sync completed successfully");

    return res.status(200).json({
      success: true,
      google_to_app: {
        imported,
        updated,
        deleted,
        skipped,
        total: googleEvents.length,
      },
      app_to_google: {
        exported,
      },
    });

  } catch (error) {
    console.error("❌ [sync] Sync error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}