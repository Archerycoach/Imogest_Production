import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type CalendarEvent = Database["public"]["Tables"]["calendar_events"]["Row"];
type CalendarEventInsert = Database["public"]["Tables"]["calendar_events"]["Insert"];

// Helper to get Google Calendar credentials from user_integrations
export const getGoogleCredentials = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log("No authenticated user");
      return null;
    }

    console.log("Checking Google Calendar credentials for user:", user.id);

    const { data, error } = await supabase
      .from("user_integrations")
      .select("*")
      .eq("user_id", user.id)
      .eq("integration_type", "google_calendar")
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      console.error("Error fetching Google Calendar credentials:", error);
      return null;
    }

    if (!data) {
      console.log("No active Google Calendar integration found");
      return null;
    }

    console.log("Google Calendar integration found:", {
      id: data.id,
      has_access_token: !!data.access_token,
      has_refresh_token: !!data.refresh_token,
      token_expiry: data.token_expiry,
      is_active: data.is_active
    });

    // Check if token is expired
    const expiresAt = new Date(data.token_expiry);
    const now = new Date();
    
    if (expiresAt <= now) {
      console.log("⚠️ Google Calendar token expired, needs refresh");
      return null;
    }

    console.log("✅ Google Calendar credentials valid");

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.token_expiry,
    };
  } catch (error) {
    console.error("Exception in getGoogleCredentials:", error);
    return null;
  }
};

// Store Google Calendar credentials in user_integrations
export const storeGoogleCredentials = async (
  accessToken: string,
  refreshToken: string | null,
  expiresAt: string
) => {
  console.log("=== storeGoogleCredentials called ===");
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error("No user authenticated");
    throw new Error("Not authenticated");
  }

  console.log("Storing credentials for user:", user.id);
  console.log("Token expiry:", expiresAt);
  console.log("Has refresh token:", !!refreshToken);

  // Check if integration already exists
  const { data: existing, error: checkError } = await supabase
    .from("user_integrations")
    .select("id")
    .eq("user_id", user.id)
    .eq("integration_type", "google_calendar")
    .maybeSingle();

  if (checkError) {
    console.error("Error checking existing integration:", checkError);
    throw checkError;
  }

  if (existing) {
    console.log("Updating existing integration:", existing.id);
    // Update existing
    const { error } = await supabase
      .from("user_integrations")
      .update({
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expiry: expiresAt,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) {
      console.error("Error updating integration:", error);
      throw error;
    }
    console.log("Integration updated successfully");
  } else {
    console.log("Creating new integration");
    // Create new
    const { error } = await supabase
      .from("user_integrations")
      .insert({
        user_id: user.id,
        integration_type: "google_calendar",
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expiry: expiresAt,
        is_active: true,
      });

    if (error) {
      console.error("Error creating integration:", error);
      throw error;
    }
    console.log("Integration created successfully");
  }

  console.log("=== storeGoogleCredentials completed ===");
};

// Remove Google Calendar credentials
export const removeGoogleCredentials = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("user_integrations")
    .update({ is_active: false })
    .eq("user_id", user.id)
    .eq("integration_type", "google_calendar");

  if (error) throw error;
};

// Check if Google Calendar is connected
export const checkGoogleCalendarConnection = async () => {
  const credentials = await getGoogleCredentials();
  return !!credentials;
};

// Import events from Google Calendar
export const importGoogleCalendarEvents = async (): Promise<CalendarEvent[]> => {
  const credentials = await getGoogleCredentials();
  if (!credentials) {
    throw new Error("Google Calendar not connected");
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  try {
    // Call our API endpoint to list Google Calendar events
    const response = await fetch("/api/google-calendar/list-events");
    const result = await response.json();

    if (result.error) {
      throw new Error(result.error);
    }

    const googleEvents = result.events || [];
    const importedEvents: CalendarEvent[] = [];

    // Import each event
    for (const gEvent of googleEvents) {
      // Check if event already exists
      const { data: existing } = await supabase
        .from("calendar_events")
        .select("id")
        .eq("google_event_id", gEvent.id)
        .single();

      if (!existing) {
        // Create new event
        const { data: newEvent, error } = await supabase
          .from("calendar_events")
          .insert({
            user_id: user.id,
            title: gEvent.summary || "Evento sem título",
            description: gEvent.description || null,
            start_time: gEvent.start.dateTime || gEvent.start.date,
            end_time: gEvent.end.dateTime || gEvent.end.date,
            location: gEvent.location || null,
            event_type: "other",
            google_event_id: gEvent.id,
          })
          .select()
          .single();

        if (!error && newEvent) {
          importedEvents.push(newEvent);
        }
      }
    }

    return importedEvents;
  } catch (error) {
    console.error("Error importing Google Calendar events:", error);
    throw error;
  }
};

// Export event to Google Calendar
export const exportEventToGoogle = async (eventId: string): Promise<string | null> => {
  const credentials = await getGoogleCredentials();
  if (!credentials) {
    throw new Error("Google Calendar not connected");
  }

  try {
    // Get the event from our database
    const { data: event, error: fetchError } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (fetchError || !event) {
      throw new Error("Event not found");
    }

    // Check if already exported
    if (event.google_event_id) {
      return event.google_event_id;
    }

    // Create event in Google Calendar
    const response = await fetch("/api/google-calendar/create-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: event.title,
        description: event.description,
        start: { dateTime: event.start_time },
        end: { dateTime: event.end_time },
        location: event.location,
      }),
    });

    const result = await response.json();

    if (result.error) {
      throw new Error(result.error);
    }

    // Update our event with Google event ID
    const { error: updateError } = await supabase
      .from("calendar_events")
      .update({ google_event_id: result.event.id })
      .eq("id", eventId);

    if (updateError) {
      console.error("Error updating event with Google ID:", updateError);
    }

    return result.event.id;
  } catch (error) {
    console.error("Error exporting event to Google Calendar:", error);
    throw error;
  }
};

// Sync all local events to Google Calendar
export const syncAllEventsToGoogle = async (): Promise<number> => {
  const credentials = await getGoogleCredentials();
  if (!credentials) {
    throw new Error("Google Calendar not connected");
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  try {
    // Get all events without google_event_id
    const { data: events, error } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("user_id", user.id)
      .is("google_event_id", null);

    if (error) throw error;

    let syncedCount = 0;

    for (const event of events || []) {
      try {
        await exportEventToGoogle(event.id);
        syncedCount++;
      } catch (err) {
        console.error(`Failed to export event ${event.id}:`, err);
      }
    }

    return syncedCount;
  } catch (error) {
    console.error("Error syncing events to Google:", error);
    throw error;
  }
};

// Update Google Calendar event when local event changes
export const updateGoogleEvent = async (
  eventId: string,
  updates: Partial<CalendarEvent>
): Promise<boolean> => {
  const credentials = await getGoogleCredentials();
  if (!credentials) {
    return false;
  }

  try {
    // Get the event
    const { data: event, error } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (error || !event || !event.google_event_id) {
      return false;
    }

    // Update in Google Calendar
    const response = await fetch("/api/google-calendar/update-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: event.google_event_id,
        summary: updates.title || event.title,
        description: updates.description !== undefined ? updates.description : event.description,
        start: { dateTime: updates.start_time || event.start_time },
        end: { dateTime: updates.end_time || event.end_time },
        location: updates.location !== undefined ? updates.location : event.location,
      }),
    });

    const result = await response.json();
    return !result.error;
  } catch (error) {
    console.error("Error updating Google Calendar event:", error);
    return false;
  }
};

// Delete event from Google Calendar
export const deleteGoogleEvent = async (googleEventId: string): Promise<boolean> => {
  const credentials = await getGoogleCredentials();
  if (!credentials) {
    return false;
  }

  try {
    const response = await fetch("/api/google-calendar/delete-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: googleEventId }),
    });

    const result = await response.json();
    return !result.error;
  } catch (error) {
    console.error("Error deleting Google Calendar event:", error);
    return false;
  }
};

// Disconnect Google Calendar
export const disconnectGoogleCalendar = async () => {
  await removeGoogleCredentials();
  return true;
};

// Full bidirectional sync
export const performFullSync = async (): Promise<{
  imported: number;
  exported: number;
  errors: string[];
}> => {
  const errors: string[] = [];
  let imported = 0;
  let exported = 0;

  try {
    // Import from Google
    const importedEvents = await importGoogleCalendarEvents();
    imported = importedEvents.length;
  } catch (error) {
    errors.push(`Import failed: ${error}`);
  }

  try {
    // Export to Google
    exported = await syncAllEventsToGoogle();
  } catch (error) {
    errors.push(`Export failed: ${error}`);
  }

  return { imported, exported, errors };
};

// Auto-sync: Export event to Google when created in Imogest
export const autoSyncEventToGoogle = async (eventId: string): Promise<boolean> => {
  try {
    const credentials = await getGoogleCredentials();
    if (!credentials) {
      // Google Calendar not connected, skip sync
      return false;
    }

    await exportEventToGoogle(eventId);
    return true;
  } catch (error) {
    console.error("Auto-sync to Google failed:", error);
    return false;
  }
};

// Auto-sync: Update Google event when updated in Imogest
export const autoSyncUpdateToGoogle = async (
  eventId: string,
  updates: Partial<CalendarEvent>
): Promise<boolean> => {
  try {
    const credentials = await getGoogleCredentials();
    if (!credentials) {
      return false;
    }

    await updateGoogleEvent(eventId, updates);
    return true;
  } catch (error) {
    console.error("Auto-sync update to Google failed:", error);
    return false;
  }
};

// Auto-sync: Delete Google event when deleted in Imogest
export const autoSyncDeleteToGoogle = async (googleEventId: string): Promise<boolean> => {
  try {
    const credentials = await getGoogleCredentials();
    if (!credentials) {
      return false;
    }

    await deleteGoogleEvent(googleEventId);
    return true;
  } catch (error) {
    console.error("Auto-sync delete to Google failed:", error);
    return false;
  }
};