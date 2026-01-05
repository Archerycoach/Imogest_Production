import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("🔄 [sync-google-calendar] Starting automatic bidirectional sync...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Check Google Calendar Integration
    const { data: calendarIntegration, error: calendarError } = await supabase
      .from("integration_settings")
      .select("settings, is_active")
      .eq("integration_name", "google_calendar")
      .single();

    if (calendarError || !calendarIntegration || !calendarIntegration.is_active) {
      console.error("❌ [sync-google-calendar] Google Calendar integration not configured or not active");
      return new Response(
        JSON.stringify({ 
          error: "Google Calendar integration not configured",
          success: false 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log("✅ [sync-google-calendar] Google Calendar integration is active");

    // 2. Get users with Google Calendar connected
    const { data: users, error: usersError } = await supabase
      .from("user_integrations")
      .select("user_id, access_token, refresh_token, token_expiry, profiles(email, full_name)")
      .eq("integration_type", "google_calendar")
      .eq("is_active", true);

    if (usersError) {
      console.error("❌ [sync-google-calendar] Error fetching users:", usersError);
      throw usersError;
    }

    if (!users || users.length === 0) {
      console.log("ℹ️ [sync-google-calendar] No users with Google Calendar connected");
      return new Response(
        JSON.stringify({ 
          message: "No users to sync",
          success: true,
          synced: 0
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log(`📊 [sync-google-calendar] Found ${users.length} users with Google Calendar connected`);

    const results = {
      success: 0,
      failed: 0,
      totalImported: 0,
      totalUpdated: 0,
      totalDeleted: 0,
      totalExported: 0,
      totalSkipped: 0,
      errors: [] as string[],
    };

    // 3. Process each user
    for (const user of users) {
      try {
        const userEmail = user.profiles?.email || user.user_id;
        console.log(`🔄 [sync-google-calendar] Syncing for user: ${userEmail}`);

        // Check if token needs refresh
        let accessToken = user.access_token;
        const tokenExpiry = user.token_expiry ? new Date(user.token_expiry) : null;
        const now = new Date();

        if (tokenExpiry && tokenExpiry <= now && user.refresh_token) {
          console.log(`🔄 [sync-google-calendar] Token expired, refreshing...`);
          
          const { clientId, clientSecret } = calendarIntegration.settings;
          
          const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: clientId,
              client_secret: clientSecret,
              refresh_token: user.refresh_token,
              grant_type: "refresh_token",
            }),
          });

          if (refreshResponse.ok) {
            const tokens = await refreshResponse.json();
            accessToken = tokens.access_token;
            
            // Update token in database
            await supabase
              .from("user_integrations")
              .update({
                access_token: tokens.access_token,
                token_expiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
              })
              .eq("user_id", user.user_id)
              .eq("integration_type", "google_calendar");

            console.log(`✅ [sync-google-calendar] Token refreshed for ${userEmail}`);
          } else {
            console.error(`❌ [sync-google-calendar] Failed to refresh token for ${userEmail}`);
            results.failed++;
            continue;
          }
        }

        // ===========================================================
        // STEP 1: SYNC FROM GOOGLE → APP (Import/Update/Delete)
        // ===========================================================

        const timeMin = new Date();
        timeMin.setMonth(timeMin.getMonth() - 1);
        const timeMax = new Date();
        timeMax.setMonth(timeMax.getMonth() + 3);

        console.log(`📅 [sync-google-calendar] Fetching Google events from ${timeMin.toISOString()} to ${timeMax.toISOString()}`);

        const calendarResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
          `timeMin=${timeMin.toISOString()}&` +
          `timeMax=${timeMax.toISOString()}&` +
          `singleEvents=true&` +
          `orderBy=startTime&` +
          `showDeleted=false`,
          {
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!calendarResponse.ok) {
          const errorText = await calendarResponse.text();
          console.error(`❌ [sync-google-calendar] Failed to fetch Google events for ${userEmail}:`, errorText);
          results.failed++;
          continue;
        }

        const calendarData = await calendarResponse.json();
        const googleEvents = calendarData.items || [];
        console.log(`📅 [sync-google-calendar] Google events fetched: ${googleEvents.length}`);

        // Fetch existing synced events from database
        const { data: existingEvents } = await supabase
          .from("calendar_events")
          .select("id, google_event_id, start_time, title, description, updated_at")
          .eq("user_id", user.user_id)
          .not("google_event_id", "is", null);

        console.log(`📊 [sync-google-calendar] Existing synced events: ${existingEvents?.length || 0}`);

        const existingEventsMap = new Map(
          existingEvents?.map((e) => [e.google_event_id, e]) || []
        );
        
        const googleEventIdsSet = new Set(googleEvents.map((e: any) => e.id));

        let imported = 0;
        let updated = 0;
        let skipped = 0;
        let deleted = 0;

        // IMPORT/UPDATE events from Google
        for (const googleEvent of googleEvents) {
          try {
            const googleEventId = googleEvent.id;
            const summary = googleEvent.summary || "Untitled Event";
            const description = googleEvent.description || "";
            const location = googleEvent.location || "";
            
            const startTime = googleEvent.start?.dateTime || googleEvent.start?.date;
            const endTime = googleEvent.end?.dateTime || googleEvent.end?.date;

            if (!startTime) {
              console.log(`⚠️ [sync-google-calendar] Skipping event without start time: ${googleEventId}`);
              skipped++;
              continue;
            }

            const existingEvent = existingEventsMap.get(googleEventId);

            if (existingEvent) {
              // Check if event needs updating
              const googleUpdated = new Date(googleEvent.updated || 0);
              const localUpdated = new Date(existingEvent.updated_at || 0);

              if (googleUpdated > localUpdated) {
                console.log(`🔄 [sync-google-calendar] Updating existing event: ${googleEventId}`);
                
                const { error: updateError } = await supabase
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
                  console.error(`❌ [sync-google-calendar] Error updating event:`, updateError);
                } else {
                  console.log(`✅ [sync-google-calendar] Event updated: ${existingEvent.id}`);
                  updated++;
                }
              } else {
                skipped++;
              }
            } else {
              // New event - import it
              console.log(`➕ [sync-google-calendar] Importing new event: ${googleEventId}`);

              const { error: insertError } = await supabase
                .from("calendar_events")
                .insert({
                  user_id: user.user_id,
                  title: summary,
                  description: description,
                  location: location,
                  start_time: startTime,
                  end_time: endTime,
                  google_event_id: googleEventId,
                  is_synced: true,
                  event_type: "other",
                  attendees: googleEvent.attendees?.map((a: any) => a.email) || [],
                })
                .select()
                .single();

              if (insertError) {
                if (insertError.code === '23505') {
                  console.log(`ℹ️ [sync-google-calendar] Event already exists (duplicate): ${googleEventId}`);
                  skipped++;
                } else {
                  console.error(`❌ [sync-google-calendar] Error importing event:`, insertError);
                  skipped++;
                }
              } else {
                console.log(`✅ [sync-google-calendar] Event imported: ${googleEventId}`);
                imported++;
              }
            }
          } catch (eventError: any) {
            console.error(`❌ [sync-google-calendar] Error processing event ${googleEvent.id}:`, eventError);
          }
        }

        // DELETE events that were removed from Google
        for (const existingEvent of (existingEvents || [])) {
          if (!googleEventIdsSet.has(existingEvent.google_event_id)) {
            console.log(`🗑️ [sync-google-calendar] Deleting event removed from Google: ${existingEvent.google_event_id}`);
            
            const { error: deleteError } = await supabase
              .from("calendar_events")
              .delete()
              .eq("id", existingEvent.id);

            if (deleteError) {
              console.error(`❌ [sync-google-calendar] Error deleting event:`, deleteError);
            } else {
              console.log(`✅ [sync-google-calendar] Event deleted: ${existingEvent.id}`);
              deleted++;
            }
          }
        }

        console.log(`✅ [sync-google-calendar] Google → App sync for ${userEmail}: ${imported} imported, ${updated} updated, ${deleted} deleted, ${skipped} skipped`);

        // ===========================================================
        // STEP 2: SYNC FROM APP → GOOGLE (Export new events)
        // ===========================================================

        console.log(`📤 [sync-google-calendar] Checking for local events to export to Google for ${userEmail}...`);

        const { data: localEvents, error: localError } = await supabase
          .from("calendar_events")
          .select("id, title, description, location, start_time, end_time, attendees")
          .eq("user_id", user.user_id)
          .is("google_event_id", null)
          .gte("start_time", timeMin.toISOString())
          .lte("start_time", timeMax.toISOString());

        if (localError) {
          console.error(`❌ [sync-google-calendar] Error fetching local events:`, localError);
        }

        let exported = 0;
        const localEventsToSync = localEvents || [];

        console.log(`📊 [sync-google-calendar] Local events to export for ${userEmail}: ${localEventsToSync.length}`);

        for (const localEvent of localEventsToSync) {
          try {
            console.log(`📤 [sync-google-calendar] Exporting local event to Google: ${localEvent.title}`);

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
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(googleEventData),
              }
            );

            if (createResponse.ok) {
              const createdEvent = await createResponse.json();
              console.log(`✅ [sync-google-calendar] Event exported to Google: ${createdEvent.id}`);

              await supabase
                .from("calendar_events")
                .update({
                  google_event_id: createdEvent.id,
                  is_synced: true,
                })
                .eq("id", localEvent.id);

              exported++;
            } else {
              const errorText = await createResponse.text();
              console.error(`❌ [sync-google-calendar] Failed to export event to Google:`, errorText);
            }
          } catch (exportError) {
            console.error(`❌ [sync-google-calendar] Error exporting event:`, exportError);
          }
        }

        console.log(`✅ [sync-google-calendar] App → Google sync for ${userEmail}: ${exported} exported`);

        results.success++;
        results.totalImported += imported;
        results.totalUpdated += updated;
        results.totalDeleted += deleted;
        results.totalExported += exported;
        results.totalSkipped += skipped;

      } catch (userError: any) {
        console.error(`❌ [sync-google-calendar] Error processing user ${user.user_id}:`, userError);
        results.failed++;
        results.errors.push(`${user.user_id}: ${userError.message}`);
      }
    }

    console.log(`✅ [sync-google-calendar] Bidirectional sync completed. Success: ${results.success}, Failed: ${results.failed}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Google Calendar bidirectional sync completed",
        users_synced: results.success,
        users_failed: results.failed,
        total_imported: results.totalImported,
        total_updated: results.totalUpdated,
        total_deleted: results.totalDeleted,
        total_exported: results.totalExported,
        total_skipped: results.totalSkipped,
        errors: results.errors,
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: any) {
    console.error("❌ [sync-google-calendar] Critical error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});