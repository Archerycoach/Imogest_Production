import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get user from session
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get user's Google Calendar integration
    const { data: rawIntegration, error: integrationError } = await supabaseAdmin
      .from("google_calendar_integrations" as any)
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (integrationError || !rawIntegration) {
      return res.status(404).json({ error: "Google Calendar not connected" });
    }

    // Cast to known type
    const integration = rawIntegration as any;

    // Check if token is expired
    const isExpired = new Date(integration.expires_at).getTime() <= new Date().getTime();
    let accessToken = integration.access_token;

    if (isExpired && integration.refresh_token) {
      // Get OAuth settings from database
      const { data: settingsRecord, error: settingsError } = await supabaseAdmin
        .from("integration_settings")
        .select("*")
        .eq("integration_name", "google_calendar")
        .single();

      if (settingsError || !settingsRecord) {
        return res.status(500).json({ error: "OAuth settings not configured" });
      }

      const settings = settingsRecord.settings as any;

      if (!settings?.client_id || !settings?.client_secret) {
        return res.status(500).json({ error: "OAuth credentials not configured" });
      }

      // Refresh the access token
      const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: settings.client_id,
          client_secret: settings.client_secret,
          refresh_token: integration.refresh_token,
          grant_type: "refresh_token",
        }),
      });

      if (!refreshResponse.ok) {
        throw new Error("Failed to refresh access token");
      }

      const tokens = await refreshResponse.json();
      accessToken = tokens.access_token;

      // Update tokens in database
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
      await supabaseAdmin
        .from("google_calendar_integrations" as any)
        .update({
          access_token: tokens.access_token,
          expires_at: expiresAt.toISOString(),
        })
        .eq("id", integration.id);
    }

    let syncedCount = 0;

    // Sync from system to Google
    if (integration.sync_direction === "both" || integration.sync_direction === "toGoogle") {
      if (integration.sync_events) {
        syncedCount += await syncEventsToGoogle(user.id, accessToken, integration.calendar_id || "primary");
      }

      if (integration.sync_tasks) {
        syncedCount += await syncTasksToGoogle(user.id, accessToken, integration.calendar_id || "primary");
      }
    }

    // Sync from Google to system
    if (integration.sync_direction === "both" || integration.sync_direction === "fromGoogle") {
      syncedCount += await syncEventsFromGoogle(user.id, accessToken, integration.calendar_id || "primary");
    }

    // Update last sync timestamp
    await supabaseAdmin
      .from("google_calendar_integrations" as any)
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", integration.id);

    res.status(200).json({ success: true, synced: syncedCount });
  } catch (error) {
    console.error("Error syncing calendar:", error);
    res.status(500).json({ error: "Failed to sync calendar" });
  }
}

async function syncEventsToGoogle(
  userId: string,
  accessToken: string,
  calendarId: string
): Promise<number> {
  try {
    // Get events from our system that need to be synced
    const { data: rawEvents, error } = await supabaseAdmin
      .from("calendar_events" as any)
      .select("*")
      .eq("user_id", userId)
      .is("google_event_id", null)
      .gte("start_time", new Date().toISOString());

    if (error) throw error;
    
    const events = rawEvents as any[];
    if (!events || events.length === 0) return 0;

    let syncedCount = 0;

    for (const event of events) {
      try {
        const googleEvent: GoogleCalendarEvent = {
          summary: event.title,
          description: event.description || "",
          start: {
            dateTime: event.start_time,
            timeZone: "Europe/Lisbon",
          },
          end: {
            dateTime: event.end_time,
            timeZone: "Europe/Lisbon",
          },
        };

        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(googleEvent),
          }
        );

        if (!response.ok) {
          console.error(`Failed to create event ${event.id} in Google Calendar`);
          continue;
        }

        const createdEvent = await response.json();

        // Update our event with Google event ID
        await supabaseAdmin
          .from("calendar_events")
          .update({ google_event_id: createdEvent.id })
          .eq("id", event.id);

        syncedCount++;
      } catch (eventError) {
        console.error(`Error syncing event ${event.id}:`, eventError);
      }
    }

    return syncedCount;
  } catch (error) {
    console.error("Error in syncEventsToGoogle:", error);
    return 0;
  }
}

async function syncTasksToGoogle(
  userId: string,
  accessToken: string,
  calendarId: string
): Promise<number> {
  try {
    // Get tasks from our system that need to be synced
    const { data: rawTasks, error } = await supabaseAdmin
      .from("tasks" as any)
      .select("*")
      .eq("user_id", userId)
      .is("google_event_id", null)
      .not("due_date", "is", null)
      .gte("due_date", new Date().toISOString());

    if (error) throw error;
    
    const tasks = rawTasks as any[];
    if (!tasks || tasks.length === 0) return 0;

    let syncedCount = 0;

    for (const task of tasks) {
      try {
        const dueDate = new Date(task.due_date!);
        const endDate = new Date(dueDate.getTime() + 60 * 60 * 1000); // 1 hour duration

        const googleEvent: GoogleCalendarEvent = {
          summary: `[Tarefa] ${task.title}`,
          description: task.description || "",
          start: {
            dateTime: dueDate.toISOString(),
            timeZone: "Europe/Lisbon",
          },
          end: {
            dateTime: endDate.toISOString(),
            timeZone: "Europe/Lisbon",
          },
        };

        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(googleEvent),
          }
        );

        if (!response.ok) {
          console.error(`Failed to create task ${task.id} in Google Calendar`);
          continue;
        }

        const createdEvent = await response.json();

        // Update our task with Google event ID
        await supabaseAdmin
          .from("tasks")
          .update({ google_event_id: createdEvent.id })
          .eq("id", task.id);

        syncedCount++;
      } catch (taskError) {
        console.error(`Error syncing task ${task.id}:`, taskError);
      }
    }

    return syncedCount;
  } catch (error) {
    console.error("Error in syncTasksToGoogle:", error);
    return 0;
  }
}

async function syncEventsFromGoogle(
  userId: string,
  accessToken: string,
  calendarId: string
): Promise<number> {
  try {
    // Get events from Google Calendar
    const timeMin = new Date().toISOString();
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?` +
      `timeMin=${encodeURIComponent(timeMin)}&singleEvents=true&orderBy=startTime`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch events from Google Calendar");
    }

    const data = await response.json();
    const googleEvents = data.items || [];

    let syncedCount = 0;

    for (const googleEvent of googleEvents) {
      try {
        // Skip all-day events
        if (!googleEvent.start?.dateTime) continue;

        // Check if this event already exists in our system
        const { data: existingEvent } = await supabaseAdmin
          .from("calendar_events" as any)
          .select("id")
          .eq("google_event_id", googleEvent.id)
          .maybeSingle();

        if (existingEvent) continue;

        // Create event in our system
        const { error: createError } = await supabaseAdmin
          .from("calendar_events" as any)
          .insert({
            user_id: userId,
            title: googleEvent.summary || "Sem título",
            description: googleEvent.description || "",
            start_time: googleEvent.start.dateTime,
            end_time: googleEvent.end.dateTime,
            google_event_id: googleEvent.id,
          });

        if (createError) {
          console.error(`Failed to create event from Google: ${googleEvent.id}`, createError);
          continue;
        }

        syncedCount++;
      } catch (eventError) {
        console.error(`Error importing event ${googleEvent.id}:`, eventError);
      }
    }

    return syncedCount;
  } catch (error) {
    console.error("Error in syncEventsFromGoogle:", error);
    return 0;
  }
}