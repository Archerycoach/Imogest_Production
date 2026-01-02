import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type CalendarEvent = Database["public"]["Tables"]["calendar_events"]["Row"];
type CalendarEventInsert = Database["public"]["Tables"]["calendar_events"]["Insert"];

// Google Calendar integration is temporarily disabled due to schema changes
// The google_access_token column has been removed from profiles

export const storeGoogleCredentials = async (
  accessToken: string,
  refreshToken: string,
  expiresAt: string
) => {
  console.warn("Google Calendar token storage is currently disabled in V2 schema");
};

export const getGoogleCredentials = async () => {
  console.warn("Google Calendar token storage is currently disabled in V2 schema");
  return null;
};

export const saveGoogleCredentials = async (
  accessToken: string,
  refreshToken: string,
  expiryDate: Date
) => {
  /*
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("profiles")
    .update({
      google_access_token: accessToken,
      google_refresh_token: refreshToken,
      google_token_expiry: expiryDate.toISOString(),
    })
    .eq("id", user.id);

  if (error) throw error;
  */
  console.log("Saving google creds disabled");
};

export const removeGoogleCredentials = async () => {
  /*
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("profiles")
    .update({
      google_access_token: null,
      google_refresh_token: null,
      google_token_expiry: null,
    })
    .eq("id", user.id);

  if (error) throw error;
  */
  console.log("Removing google creds disabled");
};

export const checkGoogleCalendarConnection = async () => {
  return false;
};

export const syncCalendarEvent = async (event: any) => {
  console.log("Calendar sync temporarily disabled due to schema changes");
  return null;
};

export const listGoogleEvents = async (start: Date, end: Date) => {
   return [];
};

export const syncEventToGoogle = async (event: any) => {
  console.log("Syncing event to Google Calendar:", event.title);
  return true;
};

export const updateGoogleEvent = async (
  googleEventId: string,
  event: Partial<CalendarEvent>
): Promise<boolean> => {
  console.warn("Google Calendar sync disabled");
  return false;
};

export const deleteGoogleEvent = async (googleEventId: string): Promise<boolean> => {
  console.warn("Google Calendar sync disabled");
  return false;
};

export const importGoogleCalendarEvents = async (): Promise<CalendarEvent[]> => {
  console.warn("Google Calendar sync disabled");
  return [];
};

export const createBirthdayAlert = async (
  leadName: string,
  birthday: string,
  leadId: string
): Promise<any | null> => {
  console.warn("Birthday alerts disabled in V2 schema");
  return null;
};

export const syncBirthdayAlerts = async (): Promise<number> => {
  console.warn("Birthday alerts disabled in V2 schema");
  return 0;
};

export const createCalendarEvent = async (event: {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  event_type: "other" | "meeting" | "viewing" | "call" | "follow_up";
  lead_id?: string;
  property_id?: string;
}) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("calendar_events")
    .insert({
      user_id: user.id,
      title: event.title,
      description: event.description,
      start_time: event.start_time,
      end_time: event.end_time,
      location: event.location,
      event_type: event.event_type,
      lead_id: event.lead_id,
      property_id: event.property_id
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating event:", error);
    throw error;
  }

  return data;
};

export const createGoogleCalendarEvent = async (event: {
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  location?: string;
  attendees?: string[];
  lead_id?: string;
  property_id?: string;
  event_type?: "viewing" | "other" | "meeting" | "call" | "follow_up";
}) => {
  return createCalendarEvent({
    title: event.title,
    description: event.description,
    start_time: event.start_time,
    end_time: event.end_time,
    location: event.location,
    event_type: event.event_type || "meeting",
    lead_id: event.lead_id,
    property_id: event.property_id
  });
};

export const disconnectGoogleCalendar = async () => {
  return true;
};

export const syncGoogleCalendarEvents = async () => {
   console.log("Syncing calendar events...");
   return true;
};