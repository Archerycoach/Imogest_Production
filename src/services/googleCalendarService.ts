import { google } from "googleapis";
import { supabase } from "@/integrations/supabase/client";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// OAuth2 Client Configuration
const getOAuth2Client = (redirectUri?: string) => {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const defaultRedirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/google-calendar/callback`;

  if (!clientId || !clientSecret) {
    throw new Error("Google Calendar OAuth credentials not configured");
  }

  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri || defaultRedirectUri
  );
};

// Generate OAuth URL
export const getAuthUrl = (): string => {
  const oauth2Client = getOAuth2Client();
  
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events"
    ],
    prompt: "consent"
  });
};

// Exchange code for tokens
export const exchangeCodeForTokens = async (code: string) => {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
};

// Store tokens in database
export const storeTokens = async (userId: string, tokens: any) => {
  const { data: existingIntegration } = await supabaseAdmin
    .from("user_integrations")
    .select("*")
    .eq("user_id", userId)
    .eq("integration_type", "google_calendar")
    .maybeSingle();

  const integrationData = {
    user_id: userId,
    integration_type: "google_calendar",
    is_active: true,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || existingIntegration?.refresh_token,
    token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
    last_sync: new Date().toISOString(),
    sync_enabled: true
  };

  if (existingIntegration) {
    const { error } = await supabaseAdmin
      .from("user_integrations")
      .update(integrationData)
      .eq("id", existingIntegration.id);

    if (error) throw error;
  } else {
    const { error } = await supabaseAdmin
      .from("user_integrations")
      .insert(integrationData);

    if (error) throw error;
  }
};

// Get stored tokens for user
export const getStoredTokens = async (userId: string) => {
  const { data, error } = await supabaseAdmin
    .from("user_integrations")
    .select("*")
    .eq("user_id", userId)
    .eq("integration_type", "google_calendar")
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  return data;
};

// Refresh expired token
export const refreshAccessToken = async (userId: string) => {
  const integration = await getStoredTokens(userId);
  
  if (!integration?.refresh_token) {
    throw new Error("No refresh token available");
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    refresh_token: integration.refresh_token
  });

  const { credentials } = await oauth2Client.refreshAccessToken();
  await storeTokens(userId, credentials);

  return credentials.access_token;
};

// Get authenticated calendar client
export const getCalendarClient = async (userId: string) => {
  const integration = await getStoredTokens(userId);
  
  if (!integration) {
    throw new Error("Google Calendar not connected");
  }

  const oauth2Client = getOAuth2Client();
  
  // Check if token is expired
  const isExpired = integration.token_expiry 
    ? new Date(integration.token_expiry) <= new Date()
    : false;

  if (isExpired && integration.refresh_token) {
    const newAccessToken = await refreshAccessToken(userId);
    oauth2Client.setCredentials({
      access_token: newAccessToken,
      refresh_token: integration.refresh_token
    });
  } else {
    oauth2Client.setCredentials({
      access_token: integration.access_token,
      refresh_token: integration.refresh_token || undefined
    });
  }

  return google.calendar({ version: "v3", auth: oauth2Client });
};

// Sync CRM event to Google Calendar
export const syncEventToGoogle = async (
  userId: string,
  event: {
    id: string;
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    location?: string;
    attendees?: string[];
  }
) => {
  const calendar = await getCalendarClient(userId);

  const googleEvent = {
    summary: event.title,
    description: event.description,
    location: event.location,
    start: {
      dateTime: event.start_time,
      timeZone: "Europe/Lisbon"
    },
    end: {
      dateTime: event.end_time,
      timeZone: "Europe/Lisbon"
    },
    attendees: event.attendees?.map(email => ({ email }))
  };

  // Check if event already has a google_event_id
  const { data: existingEvent } = await supabaseAdmin
    .from("calendar_events")
    .select("google_event_id")
    .eq("id", event.id)
    .maybeSingle();

  if (existingEvent?.google_event_id) {
    // Update existing Google event
    const response = await calendar.events.update({
      calendarId: "primary",
      eventId: existingEvent.google_event_id,
      requestBody: googleEvent
    });

    return response.data;
  } else {
    // Create new Google event
    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: googleEvent
    });

    // Store google_event_id in database
    await supabaseAdmin
      .from("calendar_events")
      .update({ google_event_id: response.data.id })
      .eq("id", event.id);

    return response.data;
  }
};

// Delete event from Google Calendar
export const deleteEventFromGoogle = async (userId: string, googleEventId: string) => {
  const calendar = await getCalendarClient(userId);

  await calendar.events.delete({
    calendarId: "primary",
    eventId: googleEventId
  });
};

// Import events from Google Calendar to CRM
export const importEventsFromGoogle = async (userId: string) => {
  const calendar = await getCalendarClient(userId);

  const response = await calendar.events.list({
    calendarId: "primary",
    timeMin: new Date().toISOString(),
    maxResults: 100,
    singleEvents: true,
    orderBy: "startTime"
  });

  const googleEvents = response.data.items || [];
  const importedEvents = [];

  for (const googleEvent of googleEvents) {
    if (!googleEvent.start?.dateTime || !googleEvent.end?.dateTime) {
      continue; // Skip all-day events
    }

    // Check if event already exists
    const { data: existingEvent } = await supabaseAdmin
      .from("calendar_events")
      .select("id")
      .eq("google_event_id", googleEvent.id)
      .maybeSingle();

    if (existingEvent) {
      // Update existing event
      await supabaseAdmin
        .from("calendar_events")
        .update({
          title: googleEvent.summary || "Sem título",
          description: googleEvent.description,
          start_time: googleEvent.start.dateTime,
          end_time: googleEvent.end.dateTime,
          location: googleEvent.location,
          updated_at: new Date().toISOString()
        })
        .eq("id", existingEvent.id);

      importedEvents.push(existingEvent.id);
    } else {
      // Create new event
      const { data: newEvent } = await supabaseAdmin
        .from("calendar_events")
        .insert({
          user_id: userId,
          title: googleEvent.summary || "Sem título",
          description: googleEvent.description,
          start_time: googleEvent.start.dateTime,
          end_time: googleEvent.end.dateTime,
          location: googleEvent.location,
          google_event_id: googleEvent.id,
          event_type: "meeting",
          status: "scheduled"
        })
        .select()
        .single();

      if (newEvent) {
        importedEvents.push(newEvent.id);
      }
    }
  }

  return importedEvents;
};

// Check connection status
export const checkConnection = async (userId: string) => {
  try {
    const integration = await getStoredTokens(userId);
    if (!integration) return { connected: false };

    const calendar = await getCalendarClient(userId);
    await calendar.calendarList.list({ maxResults: 1 });

    return {
      connected: true,
      lastSync: integration.last_sync,
      syncEnabled: integration.sync_enabled
    };
  } catch (error) {
    console.error("Google Calendar connection check failed:", error);
    return { connected: false, error: (error as Error).message };
  }
};

// Disconnect Google Calendar
export const disconnectGoogleCalendar = async (userId: string) => {
  const { error } = await supabaseAdmin
    .from("user_integrations")
    .update({ 
      is_active: false,
      sync_enabled: false 
    })
    .eq("user_id", userId)
    .eq("integration_type", "google_calendar");

  if (error) throw error;
};