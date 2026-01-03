import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { CalendarEvent } from "@/types";

type DbCalendarEvent = Database["public"]["Tables"]["calendar_events"]["Row"];
type CalendarEventInsert = Database["public"]["Tables"]["calendar_events"]["Insert"];
type CalendarEventUpdate = Database["public"]["Tables"]["calendar_events"]["Update"];

// Export Google Calendar functions
export {
  storeGoogleCredentials,
  getGoogleCredentials,
  removeGoogleCredentials,
  syncEventToGoogle,
  updateGoogleEvent,
  deleteGoogleEvent,
  importGoogleCalendarEvents,
  createBirthdayAlert,
  syncBirthdayAlerts,
} from "./googleCalendarService";

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

// Helper to sync event to Google Calendar
const syncToGoogleCalendar = async (event: CalendarEvent): Promise<string | null> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const response = await fetch("/api/google-calendar/create-event", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        event: {
          summary: event.title,
          description: event.description,
          location: event.location,
          start: event.startTime,
          end: event.endTime,
          attendees: event.attendees,
        },
      }),
    });

    if (!response.ok) {
      console.error("Failed to sync event to Google Calendar");
      return null;
    }

    const data = await response.json();
    return data.googleEventId;
  } catch (error) {
    console.error("Error syncing to Google Calendar:", error);
    return null;
  }
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

// Create new calendar event with Google Calendar sync
export const createCalendarEvent = async (event: CalendarEventInsert & { contact_id?: string | null }): Promise<CalendarEvent> => {
  // Validate dates only if end_time is provided
  if (event.end_time && new Date(event.end_time) <= new Date(event.start_time)) {
    throw new Error("A data de fim deve ser posterior à data de início");
  }

  // Create event in local database first
  const { data, error } = await supabase
    .from("calendar_events")
    .insert({
      ...event,
      event_type: event.event_type as any,
      is_synced: false,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating event:", error);
    throw error;
  }

  const createdEvent = mapDbEventToFrontend(data);

  // Try to sync to Google Calendar in background
  syncToGoogleCalendar(createdEvent).then(async (googleEventId) => {
    if (googleEventId) {
      await supabase
        .from("calendar_events")
        .update({ 
          google_event_id: googleEventId,
          is_synced: true 
        })
        .eq("id", data.id);
      
      console.log("✅ Event synced to Google Calendar:", googleEventId);
    }
  }).catch(err => {
    console.error("Background sync failed:", err);
  });

  return createdEvent;
};

// Alias for compatibility
export const createEvent = createCalendarEvent;

// Update calendar event with Google Calendar sync
export const updateCalendarEvent = async (id: string, updates: CalendarEventUpdate): Promise<CalendarEvent> => {
  // Get current event to check if it's synced
  const { data: currentEvent } = await supabase
    .from("calendar_events")
    .select("google_event_id, is_synced")
    .eq("id", id)
    .single();

  // Update in local database
  const { data, error } = await supabase
    .from("calendar_events")
    .update({
      ...updates,
      event_type: updates.event_type as any,
      is_synced: false, // Mark as not synced until Google update succeeds
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  const updatedEvent = mapDbEventToFrontend(data);

  // If event is synced to Google, update it there too
  if (currentEvent?.google_event_id) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      fetch("/api/google-calendar/update-event", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          googleEventId: currentEvent.google_event_id,
          event: {
            summary: updates.title || data.title,
            description: updates.description || data.description,
            location: updates.location || data.location,
            start: updates.start_time || data.start_time,
            end: updates.end_time || data.end_time,
          },
        }),
      }).then(async (response) => {
        if (response.ok) {
          await supabase
            .from("calendar_events")
            .update({ is_synced: true })
            .eq("id", id);
          console.log("✅ Event updated in Google Calendar");
        }
      }).catch(err => {
        console.error("Failed to update Google Calendar event:", err);
      });
    }
  }

  return updatedEvent;
};

// Delete calendar event with Google Calendar sync
export const deleteCalendarEvent = async (id: string): Promise<void> => {
  // Get event to check if it's synced
  const { data: event } = await supabase
    .from("calendar_events")
    .select("google_event_id")
    .eq("id", id)
    .single();

  // Delete from local database
  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", id);

  if (error) throw error;

  // If event is synced to Google, delete it there too
  if (event?.google_event_id) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      fetch("/api/google-calendar/delete-event", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          googleEventId: event.google_event_id,
        }),
      }).catch(err => {
        console.error("Failed to delete Google Calendar event:", err);
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