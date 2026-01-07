import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Database } from "@/integrations/supabase/types";
import { google } from "googleapis";
import axios from "axios";

// Helper to refresh Google token if expired
async function refreshGoogleToken(
  userId: string,
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{ accessToken: string; expiresAt: string } | null> {
  try {
    const response = await axios.post("https://oauth2.googleapis.com/token", {
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    });

    const { access_token, expires_in } = response.data;
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    // Update tokens in database
    await (supabaseAdmin as any)
      .from("integration_settings")
      .update({
        google_calendar_access_token: access_token,
        google_calendar_token_expiry: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    return { accessToken: access_token, expiresAt };
  } catch (error) {
    console.error("Failed to refresh Google token:", error);
    return null;
  }
}

// Helper to get valid Google access token
async function getValidGoogleToken(userId: string): Promise<string | null> {
  const { data: settings, error } = await (supabaseAdmin as any)
    .from("integration_settings")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !settings) {
    console.error("Failed to get integration settings:", error);
    return null;
  }

  const {
    google_calendar_access_token,
    google_calendar_refresh_token,
    google_calendar_token_expiry,
    google_client_id,
    google_client_secret,
  } = settings;

  if (!google_calendar_access_token || !google_calendar_refresh_token) {
    return null;
  }

  // Check if token is expired or about to expire (within 5 minutes)
  const expiryTime = new Date(google_calendar_token_expiry || 0).getTime();
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;

  if (expiryTime - now < fiveMinutes) {
    console.log("🔄 Token expired or about to expire, refreshing...");
    const refreshed = await refreshGoogleToken(
      userId,
      google_calendar_refresh_token,
      google_client_id!,
      google_client_secret!
    );

    if (!refreshed) {
      return null;
    }

    return refreshed.accessToken;
  }

  return google_calendar_access_token;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get auth token from cookie or header
    const token = req.cookies["sb-access-token"] || req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Create Supabase client with the user's token
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    // Verify the user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Get valid Google access token
    const accessToken = await getValidGoogleToken(user.id);

    if (!accessToken) {
      return res.status(400).json({
        error: "Google Calendar not connected or token expired",
      });
    }

    // Initialize Google Calendar API
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    // Get events from CRM (calendar_events table)
    const { data: crmEvents, error: crmError } = await (supabaseAdmin as any)
      .from("calendar_events")
      .select("*")
      .eq("user_id", user.id)
      .gte("start_time", new Date().toISOString());

    if (crmError) {
      console.error("Failed to fetch CRM events:", crmError);
      return res.status(500).json({ error: "Failed to fetch CRM events" });
    }

    // Get events from Google Calendar
    const googleResponse = await calendar.events.list({
      calendarId: "primary",
      timeMin: new Date().toISOString(),
      maxResults: 100,
      singleEvents: true,
      orderBy: "startTime",
    });

    const googleEvents = googleResponse.data.items || [];

    // Sync logic: CRM -> Google Calendar
    let createdCount = 0;
    let updatedCount = 0;

    for (const crmEvent of crmEvents || []) {
      const existingGoogleEvent = googleEvents.find(
        (ge) => ge.extendedProperties?.private?.crmEventId === crmEvent.id
      );

      const eventData = {
        summary: crmEvent.title,
        description: crmEvent.description || "",
        start: {
          dateTime: crmEvent.start_time,
          timeZone: "UTC",
        },
        end: {
          dateTime: crmEvent.end_time,
          timeZone: "UTC",
        },
        extendedProperties: {
          private: {
            crmEventId: crmEvent.id,
          },
        },
      };

      if (existingGoogleEvent) {
        // Update existing event
        await calendar.events.update({
          calendarId: "primary",
          eventId: existingGoogleEvent.id!,
          requestBody: eventData,
        });
        updatedCount++;
      } else {
        // Create new event
        await calendar.events.insert({
          calendarId: "primary",
          requestBody: eventData,
        });
        createdCount++;
      }
    }

    // Sync logic: Google Calendar -> CRM (events created in Google)
    let importedCount = 0;

    for (const googleEvent of googleEvents) {
      // Skip if it was created from CRM
      if (googleEvent.extendedProperties?.private?.crmEventId) {
        continue;
      }

      // Check if this Google event already exists in CRM
      const { data: existingCrmEvent } = await (supabaseAdmin as any)
        .from("calendar_events")
        .select("id")
        .eq("google_event_id", googleEvent.id)
        .single();

      if (!existingCrmEvent) {
        // Import to CRM
        await (supabaseAdmin as any).from("calendar_events").insert({
          user_id: user.id,
          title: googleEvent.summary || "Untitled Event",
          description: googleEvent.description || null,
          start_time: googleEvent.start?.dateTime || googleEvent.start?.date,
          end_time: googleEvent.end?.dateTime || googleEvent.end?.date,
          google_event_id: googleEvent.id,
        });
        importedCount++;
      }
    }

    console.log(
      `✅ Sync complete: Created ${createdCount}, Updated ${updatedCount}, Imported ${importedCount}`
    );

    return res.status(200).json({
      success: true,
      created: createdCount,
      updated: updatedCount,
      imported: importedCount,
    });
  } catch (error) {
    console.error("Error syncing with Google Calendar:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}