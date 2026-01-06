import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

interface SyncStats {
  google_to_app: {
    imported: number;
    updated: number;
    deleted: number;
    skipped: number;
    total: number;
  };
  app_to_google: {
    exported: number;
    updated: number;
  };
}

async function getGoogleCalendarCredentials(userId: string) {
  const { data: credentials, error: credError } = await (supabaseAdmin as any)
    .from("user_integrations")
    .select("*")
    .eq("user_id", userId)
    .eq("integration_type", "google_calendar")
    .maybeSingle();

  if (credError || !credentials || !credentials.is_active) {
    console.error("❌ [sync] No Google credentials found or integration not active");
    throw new Error("Google Calendar not connected");
  }

  console.log("✅ [sync] Google credentials retrieved and active");

  return credentials;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("🔄 [sync] Starting bidirectional Google Calendar sync...");

    // Get user from authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error("❌ [sync] Auth error:", authError);
      return res.status(401).json({ error: "Invalid token" });
    }

    console.log("✅ [sync] User authenticated:", user.id);

    // Get Google credentials from user_integrations table
    const credentials = await getGoogleCalendarCredentials(user.id);

    const stats: SyncStats = {
      google_to_app: {
        imported: 0,
        updated: 0,
        deleted: 0,
        skipped: 0,
        total: 0,
      },
      app_to_google: {
        exported: 0,
        updated: 0,
      },
    };

    // Get access token (refresh if needed)
    let accessToken = credentials.access_token;
    const expiresAt = new Date(credentials.token_expiry);
    const now = new Date();

    if (expiresAt <= now) {
      console.log("🔄 [sync] Access token expired, refreshing...");
      
      // Get Google Calendar credentials from database
      const { data: gcSettings, error: gcError } = await supabaseAdmin
        .from("integration_settings")
        .select("settings")
        .eq("integration_name", "google_calendar")
        .single();

      if (gcError || !gcSettings) {
        console.error("❌ [sync] Failed to fetch Google Calendar credentials");
        throw new Error("Google Calendar credentials not found");
      }

      const { clientId, clientSecret } = gcSettings.settings as any;

      if (!clientId || !clientSecret) {
        console.error("❌ [sync] Incomplete Google Calendar credentials");
        throw new Error("Incomplete Google Calendar credentials");
      }

      const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: credentials.refresh_token,
          grant_type: "refresh_token",
        }),
      });

      if (!refreshResponse.ok) {
        throw new Error("Failed to refresh token");
      }

      const refreshData = await refreshResponse.json();
      accessToken = refreshData.access_token;

      // Update credentials in user_integrations table
      await (supabaseAdmin as any)
        .from("user_integrations")
        .update({
          access_token: accessToken,
          token_expiry: new Date(now.getTime() + refreshData.expires_in * 1000).toISOString(),
        })
        .eq("id", credentials.id);

      console.log("✅ [sync] Access token refreshed successfully");
    }

    // ==================================================================
    // PART 1: SYNC FROM GOOGLE CALENDAR TO APP (Import/Update/Delete)
    // ==================================================================

    // Fetch events from Google Calendar (last month to +3 months)
    const timeMin = new Date();
    timeMin.setMonth(timeMin.getMonth() - 1);
    const timeMax = new Date();
    timeMax.setMonth(timeMax.getMonth() + 3);

    console.log(`📅 [sync] Fetching Google events from ${timeMin.toISOString().split('T')[0]} to ${timeMax.toISOString().split('T')[0]}`);

    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${timeMin.toISOString()}&` +
      `timeMax=${timeMax.toISOString()}&` +
      `singleEvents=true&` +
      `orderBy=startTime`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!calendarResponse.ok) {
      const errorText = await calendarResponse.text();
      console.error("❌ [sync] Google Calendar API error:", errorText);
      throw new Error(`Google Calendar API error: ${errorText}`);
    }

    const calendarData = await calendarResponse.json();
    const googleEvents = calendarData.items || [];
    stats.google_to_app.total = googleEvents.length;

    console.log(`📊 [sync] Google events fetched: ${googleEvents.length}`);

    // Get existing synced events from database
    const { data: existingEvents } = await supabaseAdmin
      .from("calendar_events")
      .select("id, google_event_id, updated_at")
      .eq("user_id", user.id)
      .not("google_event_id", "is", null);

    const existingEventsMap = new Map(
      (existingEvents || []).map((e) => [e.google_event_id!, { id: e.id, updated_at: e.updated_at }])
    );

    console.log(`📊 [sync] Existing synced events in DB: ${existingEventsMap.size}`);

    // Process each Google event
    for (const gEvent of googleEvents) {
      const googleEventId = gEvent.id;
      const existingEvent = existingEventsMap.get(googleEventId);

      if (existingEvent) {
        // Event exists - check if it needs updating
        const googleUpdated = new Date(gEvent.updated);
        const localUpdated = new Date(existingEvent.updated_at);

        if (googleUpdated > localUpdated) {
          // Google version is newer - update local event
          console.log(`🔄 [sync] Updating existing event: ${googleEventId}`);
          
          const { error: updateError } = await supabaseAdmin
            .from("calendar_events")
            .update({
              title: gEvent.summary || "Sem título",
              description: gEvent.description || null,
              start_time: gEvent.start.dateTime || gEvent.start.date,
              end_time: gEvent.end?.dateTime || gEvent.end?.date || null,
              location: gEvent.location || null,
              is_synced: true,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingEvent.id);

          if (!updateError) {
            stats.google_to_app.updated++;
            console.log(`✅ [sync] Event updated: ${existingEvent.id}`);
          } else {
            console.error(`❌ [sync] Error updating event:`, updateError);
          }
        } else {
          stats.google_to_app.skipped++;
        }

        // Remove from map so we know it still exists in Google
        existingEventsMap.delete(googleEventId);
      } else {
        // New event from Google - import it
        console.log(`➕ [sync] Importing new event: ${googleEventId}`);
        
        const { error: insertError } = await supabaseAdmin
          .from("calendar_events")
          .insert({
            user_id: user.id,
            title: gEvent.summary || "Sem título",
            description: gEvent.description || null,
            start_time: gEvent.start.dateTime || gEvent.start.date,
            end_time: gEvent.end?.dateTime || gEvent.end?.date || null,
            location: gEvent.location || null,
            google_event_id: googleEventId,
            is_synced: true,
            event_type: "meeting",
          })
          .select()
          .single();

        if (!insertError) {
          stats.google_to_app.imported++;
          console.log(`✅ [sync] Event imported: ${googleEventId}`);
        } else {
          // Ignore duplicate errors (constraint violation)
          if (insertError.code !== "23505") {
            console.error(`❌ [sync] Error importing event:`, insertError);
          } else {
            console.log(`⏭️ [sync] Event already exists (duplicate), skipping`);
            stats.google_to_app.skipped++;
          }
        }
      }
    }

    // Events remaining in the map were deleted from Google - delete from app
    if (existingEventsMap.size > 0) {
      console.log(`🗑️ [sync] Deleting ${existingEventsMap.size} events removed from Google`);
      
      for (const [googleEventId, eventData] of existingEventsMap) {
        const { error: deleteError } = await supabaseAdmin
          .from("calendar_events")
          .delete()
          .eq("id", eventData.id);

        if (!deleteError) {
          stats.google_to_app.deleted++;
          console.log(`✅ [sync] Event deleted: ${eventData.id}`);
        } else {
          console.error(`❌ [sync] Error deleting event:`, deleteError);
        }
      }
    }

    console.log(
      `✅ [sync] Google → App sync completed: ${stats.google_to_app.imported} imported, ` +
      `${stats.google_to_app.updated} updated, ${stats.google_to_app.deleted} deleted, ` +
      `${stats.google_to_app.skipped} skipped`
    );

    // ==================================================================
    // PART 2: SYNC FROM APP TO GOOGLE CALENDAR (Export New + Update Modified)
    // ==================================================================

    console.log("📤 [sync] Checking for local events to export/update to Google...");

    // Get local events that need syncing
    const { data: localEvents } = await supabaseAdmin
      .from("calendar_events")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_synced", false);

    console.log(`📊 [sync] Local events needing sync: ${localEvents?.length || 0}`);

    if (localEvents && localEvents.length > 0) {
      for (const event of localEvents) {
        try {
          if (!event.google_event_id) {
            // NEW EVENT - Export to Google
            console.log(`📤 [sync] Exporting NEW event to Google: ${event.title}`);

            const googleEventData = {
              summary: event.title,
              description: event.description || undefined,
              start: {
                dateTime: event.start_time,
                timeZone: "Europe/Lisbon",
              },
              end: event.end_time
                ? {
                    dateTime: event.end_time,
                    timeZone: "Europe/Lisbon",
                  }
                : undefined,
              location: event.location || undefined,
            };

            const createResponse = await fetch(
              "https://www.googleapis.com/calendar/v3/calendars/primary/events",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(googleEventData),
              }
            );

            if (createResponse.ok) {
              const createdEvent = await createResponse.json();
              
              // Update local event with Google ID
              await supabaseAdmin
                .from("calendar_events")
                .update({
                  google_event_id: createdEvent.id,
                  is_synced: true,
                })
                .eq("id", event.id);

              stats.app_to_google.exported++;
              console.log(`✅ [sync] Event exported to Google: ${createdEvent.id}`);
            } else {
              const errorText = await createResponse.text();
              console.error(`❌ [sync] Error exporting event to Google:`, errorText);
            }
          } else {
            // MODIFIED EVENT - Update in Google
            console.log(`🔄 [sync] Updating MODIFIED event in Google: ${event.title} (${event.google_event_id})`);

            const googleEventData = {
              summary: event.title,
              description: event.description || undefined,
              start: {
                dateTime: event.start_time,
                timeZone: "Europe/Lisbon",
              },
              end: event.end_time
                ? {
                    dateTime: event.end_time,
                    timeZone: "Europe/Lisbon",
                  }
                : undefined,
              location: event.location || undefined,
            };

            const updateResponse = await fetch(
              `https://www.googleapis.com/calendar/v3/calendars/primary/events/${event.google_event_id}`,
              {
                method: "PUT",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(googleEventData),
              }
            );

            if (updateResponse.ok) {
              // Mark as synced
              await supabaseAdmin
                .from("calendar_events")
                .update({
                  is_synced: true,
                })
                .eq("id", event.id);

              stats.app_to_google.updated++;
              console.log(`✅ [sync] Event updated in Google: ${event.google_event_id}`);
            } else {
              const errorText = await updateResponse.text();
              console.error(`❌ [sync] Error updating event in Google:`, errorText);
            }
          }
        } catch (error) {
          console.error(`❌ [sync] Error processing event ${event.id}:`, error);
        }
      }
    }

    console.log(
      `✅ [sync] App → Google sync completed. Exported: ${stats.app_to_google.exported}, Updated: ${stats.app_to_google.updated}`
    );

    console.log("🎉 [sync] Bidirectional sync completed successfully");

    return res.status(200).json({
      success: true,
      ...stats,
    });
  } catch (error) {
    console.error("❌ [sync] Sync error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}