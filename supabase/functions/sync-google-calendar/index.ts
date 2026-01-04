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
    console.log("🔄 [sync-google-calendar] Starting automatic sync...");

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

        // Fetch events from Google Calendar (last 7 days to next 30 days)
        const timeMin = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        const calendarResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
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
          .select("id, google_event_id, updated_at")
          .eq("user_id", user.user_id)
          .not("google_event_id", "is", null);

        console.log(`📊 [sync-google-calendar] Existing synced events: ${existingEvents?.length || 0}`);

        const existingEventIds = new Set(existingEvents?.map((e) => e.google_event_id) || []);
        const existingEventsMap = new Map(
          existingEvents?.map((e) => [e.google_event_id, e]) || []
        );

        let imported = 0;
        let updated = 0;
        let skipped = 0;

        // Process each Google event
        for (const googleEvent of googleEvents) {
          try {
            // Skip if no start time
            if (!googleEvent.start || (!googleEvent.start.dateTime && !googleEvent.start.date)) {
              continue;
            }

            const startTime = googleEvent.start.dateTime || `${googleEvent.start.date}T00:00:00`;
            const endTime = googleEvent.end?.dateTime || googleEvent.end?.date 
              ? (googleEvent.end.dateTime || `${googleEvent.end.date}T23:59:59`)
              : new Date(new Date(startTime).getTime() + 60 * 60 * 1000).toISOString();

            const eventData = {
              user_id: user.user_id,
              title: googleEvent.summary || "Sem título",
              description: googleEvent.description || null,
              start_time: startTime,
              end_time: endTime,
              location: googleEvent.location || null,
              google_event_id: googleEvent.id,
              is_google_synced: true,
              color: googleEvent.colorId ? `color-${googleEvent.colorId}` : null,
              updated_at: new Date().toISOString(),
            };

            // Check if event already exists
            if (existingEventIds.has(googleEvent.id)) {
              const existing = existingEventsMap.get(googleEvent.id);
              const googleUpdated = new Date(googleEvent.updated || 0);
              const localUpdated = new Date(existing?.updated_at || 0);

              // Only update if Google event is newer
              if (googleUpdated > localUpdated) {
                await supabase
                  .from("calendar_events")
                  .update(eventData)
                  .eq("google_event_id", googleEvent.id)
                  .eq("user_id", user.user_id);

                console.log(`🔄 [sync-google-calendar] Updating event: ${googleEvent.id}`);
                updated++;
              } else {
                skipped++;
              }
            } else {
              // Import new event
              await supabase
                .from("calendar_events")
                .insert(eventData);

              console.log(`➕ [sync-google-calendar] Importing new event: ${googleEvent.id}`);
              imported++;
            }

          } catch (eventError: any) {
            console.error(`❌ [sync-google-calendar] Error processing event ${googleEvent.id}:`, eventError);
          }
        }

        console.log(`✅ [sync-google-calendar] User ${userEmail}: ${imported} imported, ${updated} updated, ${skipped} skipped`);
        results.success++;
        results.totalImported += imported;
        results.totalUpdated += updated;
        results.totalSkipped += skipped;

      } catch (userError: any) {
        console.error(`❌ [sync-google-calendar] Error processing user ${user.user_id}:`, userError);
        results.failed++;
        results.errors.push(`${user.user_id}: ${userError.message}`);
      }
    }

    console.log(`✅ [sync-google-calendar] Sync completed. Success: ${results.success}, Failed: ${results.failed}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Google Calendar sync completed",
        users_synced: results.success,
        users_failed: results.failed,
        total_imported: results.totalImported,
        total_updated: results.totalUpdated,
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