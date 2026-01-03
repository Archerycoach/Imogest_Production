import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@supabase/supabase-js";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  console.log("\n🔄 Starting Google Calendar sync...");

  try {
    // Get user from session
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false
        }
      }
    );

    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "");
    
    if (!token) {
      console.error("❌ No authorization token found");
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error("❌ Failed to get user:", userError);
      return res.status(401).json({ error: "Not authenticated" });
    }

    console.log("👤 Syncing for user:", user.id);

    // Get user's Google Calendar tokens
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from("user_integrations")
      .select("access_token, refresh_token, token_expiry")
      .eq("user_id", user.id)
      .eq("integration_type", "google_calendar")
      .eq("is_active", true)
      .single();

    if (integrationError || !integration) {
      console.error("❌ No Google Calendar integration found:", integrationError);
      return res.status(400).json({ error: "Google Calendar not connected" });
    }

    console.log("✅ Found integration, fetching events from Google...");

    // Fetch events from Google Calendar
    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?" + 
      new URLSearchParams({
        timeMin: new Date().toISOString(),
        maxResults: "50",
        singleEvents: "true",
        orderBy: "startTime"
      }),
      {
        headers: {
          Authorization: `Bearer ${integration.access_token}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("❌ Failed to fetch Google Calendar events:", errorData);
      return res.status(response.status).json({ error: "Failed to fetch events from Google" });
    }

    const googleEvents = await response.json();
    console.log(`📅 Found ${googleEvents.items?.length || 0} events from Google Calendar`);

    let importedCount = 0;
    let skippedCount = 0;

    // Import each event
    for (const event of googleEvents.items || []) {
      if (!event.start?.dateTime && !event.start?.date) {
        skippedCount++;
        continue;
      }

      // Check if event already exists
      const { data: existing } = await supabaseAdmin
        .from("calendar_events")
        .select("id")
        .eq("google_event_id", event.id)
        .eq("user_id", user.id)
        .single();

      if (existing) {
        skippedCount++;
        continue;
      }

      // Import new event
      const { error: insertError } = await supabaseAdmin
        .from("calendar_events")
        .insert({
          user_id: user.id,
          title: event.summary || "Sem título",
          description: event.description || null,
          start_time: event.start.dateTime || event.start.date,
          end_time: event.end?.dateTime || event.end?.date || event.start.dateTime || event.start.date,
          location: event.location || null,
          event_type: "other",
          google_event_id: event.id,
        });

      if (insertError) {
        console.error("❌ Failed to import event:", event.summary, insertError);
      } else {
        importedCount++;
      }
    }

    console.log(`✅ Sync complete: ${importedCount} imported, ${skippedCount} skipped`);

    res.json({ 
      success: true, 
      imported: importedCount,
      skipped: skippedCount,
      total: googleEvents.items?.length || 0
    });
  } catch (error) {
    console.error("\n❌ Error syncing Google Calendar:", error);
    res.status(500).json({ error: "Failed to sync with Google Calendar" });
  }
}