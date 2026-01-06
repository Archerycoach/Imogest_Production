import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { CalendarEvent } from "@/types";

type DbCalendarEvent = Database["public"]["Tables"]["calendar_events"]["Row"];
type CalendarEventInsert = Database["public"]["Tables"]["calendar_events"]["Insert"];
type CalendarEventUpdate = Database["public"]["Tables"]["calendar_events"]["Update"];

// Helper to map database event to frontend CalendarEvent
const mapDbEventToFrontend = (dbEvent: DbCalendarEvent): CalendarEvent => ({
  id: dbEvent.id,
  title: dbEvent.title,
  description: dbEvent.description || "",
  startTime: dbEvent.start_time,
  endTime: dbEvent.end_time,
  location: dbEvent.location || "",
  attendees: Array.isArray(dbEvent.attendees) ? (dbEvent.attendees as string[]) : [],
  leadId: dbEvent.lead_id || undefined,
  propertyId: dbEvent.property_id || undefined,
  contactId: dbEvent.contact_id || undefined,
  googleEventId: dbEvent.google_event_id || undefined,
  googleSynced: !!dbEvent.google_event_id,
  eventType: dbEvent.event_type || "meeting",
  createdAt: dbEvent.created_at,
  userId: dbEvent.user_id || ""
});

// Trigger full Google Calendar sync
const triggerGoogleSync = async (): Promise<void> => {
  // Sync removed
  console.log("Google sync not implemented");
};

// Get all calendar events for current user
export const getCalendarEvents = async (): Promise<CalendarEvent[]> => {
  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Error fetching calendar events:", error);
    return [];
  }

  return (data || []).map(mapDbEventToFrontend);
};

// Get events within date range
export const getEventsByDateRange = async (
  startDate: Date,
  endDate: Date
): Promise<CalendarEvent[]> => {
  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .gte("start_time", startDate.toISOString())
    .lte("start_time", endDate.toISOString())
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Error fetching events by date range:", error);
    return [];
  }

  return (data || []).map(mapDbEventToFrontend);
};

// Get single event by ID
export const getCalendarEvent = async (id: string): Promise<CalendarEvent | null> => {
  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching calendar event:", error);
    return null;
  }

  return data ? mapDbEventToFrontend(data) : null;
};

// Create new calendar event with automatic Google Calendar sync
export const createCalendarEvent = async (event: CalendarEventInsert & { contact_id?: string | null }): Promise<CalendarEvent> => {
  console.log("🔵 [calendarService] createCalendarEvent called");
  
  // Validate dates only if end_time is provided
  if (event.end_time && new Date(event.end_time) <= new Date(event.start_time)) {
    throw new Error("A data de fim deve ser posterior à data de início");
  }

  // Create event in local database (without google_event_id)
  const { data, error } = await supabase
    .from("calendar_events")
    .insert({
      ...event,
      event_type: event.event_type as any,
      is_synced: false, // Mark as not synced yet
      google_event_id: null, // Explicitly set to null so sync can pick it up
    })
    .select()
    .single();

  if (error) {
    console.error("❌ [calendarService] Error creating event:", error);
    throw error;
  }

  console.log("✅ [calendarService] Event created in DB:", data.id);

  const createdEvent = mapDbEventToFrontend(data);

  // Trigger full bidirectional sync (will export this event to Google)
  triggerGoogleSync();

  return createdEvent;
};

// Alias for compatibility
export const createEvent = createCalendarEvent;

// Update calendar event with automatic Google Calendar sync
export const updateCalendarEvent = async (id: string, updates: CalendarEventUpdate): Promise<CalendarEvent> => {
  console.log("🔵 [calendarService] updateCalendarEvent called for:", id);
  console.log("🔵 [calendarService] Updates:", updates);

  // Get current event to check if it's synced
  const { data: currentEvent } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("id", id)
    .single();

  if (!currentEvent) {
    throw new Error("Event not found");
  }

  console.log("📋 [calendarService] Current event:", {
    id: currentEvent.id,
    google_event_id: currentEvent.google_event_id,
    is_synced: currentEvent.is_synced
  });

  // Update in local database
  const { data, error } = await supabase
    .from("calendar_events")
    .update({
      ...updates,
      event_type: updates.event_type as any,
      is_synced: false, // Mark as not synced (needs update in Google)
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("❌ [calendarService] Error updating event:", error);
    throw error;
  }

  console.log("✅ [calendarService] Event updated in DB");

  const updatedEvent = mapDbEventToFrontend(data);

  // If event was synced to Google, trigger sync to update it there
  if (currentEvent.google_event_id) {
    console.log("🔄 [calendarService] Event is synced, triggering Google sync for update");
    triggerGoogleSync();
  }

  return updatedEvent;
};

// Delete calendar event with automatic Google Calendar sync
export const deleteCalendarEvent = async (id: string): Promise<void> => {
  console.log("🔵 [calendarService] deleteCalendarEvent called for:", id);

  // Get event to check if it's synced
  const { data: event } = await supabase
    .from("calendar_events")
    .select("google_event_id")
    .eq("id", id)
    .single();

  console.log("📋 [calendarService] Event to delete:", {
    id,
    google_event_id: event?.google_event_id
  });

  const wasSynced = !!event?.google_event_id;

  // Delete from local database
  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("❌ [calendarService] Error deleting event:", error);
    throw error;
  }

  console.log("✅ [calendarService] Event deleted from DB");

  // If event was synced to Google, trigger sync to delete it there
  if (wasSynced) {
    console.log("🔄 [calendarService] Event was synced, triggering Google sync for deletion");
    
    // For deletion, we need to call delete API directly since the event no longer exists in DB
    const { data: { session } } = await supabase.auth.getSession();
    if (session && event?.google_event_id) {
      await fetch("/api/google-calendar/delete-event", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          googleEventId: event.google_event_id,
        }),
      }).then((response) => {
        if (response.ok) {
          console.log("✅ [calendarService] Google Calendar event deleted");
        } else {
          console.error("❌ [calendarService] Failed to delete from Google Calendar");
        }
      }).catch(err => {
        console.error("❌ [calendarService] Google Calendar delete error:", err);
      });
    }
  }
};

// Get events by type
export const getEventsByType = async (type: string): Promise<CalendarEvent[]> => {
  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("event_type", type)
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Error fetching events by type:", error);
    return [];
  }

  return (data || []).map(mapDbEventToFrontend);
};

// Get today's events
export const getTodayEvents = async (): Promise<CalendarEvent[]> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return getEventsByDateRange(today, tomorrow);
};

// Get upcoming events (next 7 days)
export const getUpcomingEvents = async (): Promise<CalendarEvent[]> => {
  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);

  return getEventsByDateRange(today, nextWeek);
};

// Sync events from Google Calendar (import + update)
export const syncEventToGoogle = async (event: any): Promise<boolean> => {
  console.log("🔄 [calendarService] syncEventToGoogle called");
  return true;
};

export const updateGoogleEvent = async (
  googleEventId: string,
  event: Partial<CalendarEvent>
): Promise<boolean> => {
  console.log("🔄 [calendarService] updateGoogleEvent called");
  return false;
};

export const deleteGoogleEvent = async (googleEventId: string): Promise<boolean> => {
  console.log("🔄 [calendarService] deleteGoogleEvent called");
  return false;
};

export const importGoogleCalendarEvents = async (): Promise<CalendarEvent[]> => {
  console.log("🔄 [calendarService] importGoogleCalendarEvents called");
  return [];
};