import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type CalendarEvent = Database["public"]["Tables"]["calendar_events"]["Row"];
type CalendarEventInsert = Database["public"]["Tables"]["calendar_events"]["Insert"];

// Google Calendar integration uses user_integrations table

export const storeGoogleCredentials = async (
  accessToken: string,
  refreshToken: string,
  expiresAt: string
) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Format date for PostgreSQL
  const expiryDate = new Date(expiresAt).toISOString();

  const { error } = await supabase
    .from("user_integrations")
    .upsert({
      user_id: user.id,
      integration_type: "google_calendar",
      access_token: accessToken,
      refresh_token: refreshToken,
      token_expiry: expiryDate,
      updated_at: new Date().toISOString()
    }, {
      onConflict: "user_id,integration_type"
    });

  if (error) throw error;
};

export const getGoogleCredentials = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_integrations")
    .select("access_token, refresh_token, token_expiry")
    .eq("user_id", user.id)
    .eq("integration_type", "google_calendar")
    .maybeSingle();

  if (error) {
    console.error("Error fetching Google credentials:", error);
    return null;
  }

  return data;
};

export const saveGoogleCredentials = async (
  accessToken: string,
  refreshToken: string,
  expiryDate: Date
) => {
  return storeGoogleCredentials(
    accessToken,
    refreshToken,
    expiryDate.toISOString()
  );
};

export const removeGoogleCredentials = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("user_integrations")
    .delete()
    .eq("user_id", user.id)
    .eq("integration_type", "google_calendar");

  if (error) throw error;
};

export const checkGoogleCalendarConnection = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("user_integrations")
    .select("is_active")
    .eq("user_id", user.id)
    .eq("integration_type", "google_calendar")
    .maybeSingle();

  return !!data?.is_active;
};

export const syncCalendarEvent = async (event: any) => {
  console.log("Calendar sync temporarily disabled due to schema changes");
  return null;
};

export const listGoogleEvents = async (start: Date, end: Date) => {
   // Placeholder for actual implementation if needed later
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

// Check if Google Calendar is connected for current user
export const isGoogleCalendarConnected = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return false;

    // Use maybeSingle instead of single to avoid errors when no rows found
    const { data, error } = await supabase
      .from("user_integrations")
      .select("is_active")
      .eq("user_id", user.id)
      .eq("integration_type", "google_calendar")
      .maybeSingle();

    if (error) {
      console.error("Error checking Google Calendar connection:", error);
      return false;
    }

    return !!data?.is_active;
  } catch (error) {
    console.error("Error in isGoogleCalendarConnected:", error);
    return false;
  }
};

// Get Google Calendar access token
export const getGoogleCalendarToken = async (): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    const { data, error } = await supabase
      .from("user_integrations")
      .select("access_token")
      .eq("user_id", user.id)
      .eq("integration_type", "google_calendar")
      .maybeSingle();

    if (error) {
      console.error("Error getting Google Calendar token:", error);
      return null;
    }

    return data?.access_token || null;
  } catch (error) {
    console.error("Error in getGoogleCalendarToken:", error);
    return null;
  }
};