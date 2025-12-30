import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type CalendarEvent = Database["public"]["Tables"]["calendar_events"]["Row"];
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

  return data || [];
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

  return data || [];
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

  return data;
};

// Create new calendar event
export const createCalendarEvent = async (event: CalendarEventInsert) => {
  // Validate dates
  if (new Date(event.end_time) <= new Date(event.start_time)) {
    throw new Error("A data de fim deve ser posterior à data de início");
  }

  const { data, error } = await supabase
    .from("calendar_events")
    .insert({
      ...event,
      event_type: event.event_type as any
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating event:", error);
    throw error;
  }

  return data;
};

// Update calendar event
export const updateCalendarEvent = async (id: string, updates: CalendarEventUpdate) => {
  const { data, error } = await supabase
    .from("calendar_events")
    .update({
      ...updates,
      event_type: updates.event_type as any
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Delete calendar event
export const deleteCalendarEvent = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", id);

  if (error) throw error;
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

  return data || [];
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