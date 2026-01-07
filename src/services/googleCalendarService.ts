import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type CalendarEvent = Database["public"]["Tables"]["calendar_events"]["Row"];
type CalendarEventInsert = Database["public"]["Tables"]["calendar_events"]["Insert"];

// Check if Google Calendar is connected for current user
export const isGoogleCalendarConnected = async (): Promise<boolean> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) return false;

    const response = await fetch("/api/google-calendar/status", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      console.error("Error checking Google Calendar connection");
      return false;
    }

    const { isConnected } = await response.json();
    return isConnected;
  } catch (error) {
    console.error("Error in isGoogleCalendarConnected:", error);
    return false;
  }
};

// Trigger sync via API
export const syncGoogleCalendarEvents = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.error("No session found");
      return false;
    }

    const response = await fetch("/api/google-calendar/sync", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      console.error("Sync failed:", await response.text());
      return false;
    }

    const result = await response.json();
    console.log("✅ Sync completed:", result);
    return true;
  } catch (error) {
    console.error("Error in syncGoogleCalendarEvents:", error);
    return false;
  }
};

// Disconnect Google Calendar
export const disconnectGoogleCalendar = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.error("No session found");
      return false;
    }

    const response = await fetch("/api/google-calendar/disconnect", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      console.error("Disconnect failed");
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error disconnecting Google Calendar:", error);
    return false;
  }
};

// Legacy functions kept for compatibility (now just log warnings)
export const storeGoogleCredentials = async (
  accessToken: string,
  refreshToken: string,
  expiresAt: string
) => {
  console.warn("storeGoogleCredentials is deprecated - OAuth flow handles this automatically");
};

export const getGoogleCredentials = async () => {
  console.warn("getGoogleCredentials is deprecated - use API routes instead");
  return null;
};

export const saveGoogleCredentials = async (
  accessToken: string,
  refreshToken: string,
  expiryDate: Date
) => {
  console.warn("saveGoogleCredentials is deprecated - OAuth flow handles this automatically");
};

export const removeGoogleCredentials = async () => {
  return disconnectGoogleCalendar();
};

export const checkGoogleCalendarConnection = async () => {
  return isGoogleCalendarConnected();
};

export const syncCalendarEvent = async (event: any) => {
  console.log("syncCalendarEvent - use syncGoogleCalendarEvents instead");
  return null;
};

export const listGoogleEvents = async (start: Date, end: Date) => {
  console.log("listGoogleEvents - not implemented");
  return [];
};

export const syncEventToGoogle = async (event: any) => {
  console.log("syncEventToGoogle - use sync API instead");
  return true;
};

export const updateGoogleEvent = async (
  googleEventId: string,
  event: Partial<CalendarEvent>
): Promise<boolean> => {
  console.warn("updateGoogleEvent - not implemented");
  return false;
};

export const deleteGoogleEvent = async (googleEventId: string): Promise<boolean> => {
  console.warn("deleteGoogleEvent - not implemented");
  return false;
};

export const importGoogleCalendarEvents = async (): Promise<CalendarEvent[]> => {
  console.warn("importGoogleCalendarEvents - use sync API instead");
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

export const getGoogleCalendarToken = async (): Promise<string | null> => {
  console.warn("getGoogleCalendarToken - use API routes instead");
  return null;
};