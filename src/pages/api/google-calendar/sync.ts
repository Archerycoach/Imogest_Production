import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get user from Authorization header (same pattern as send-email.ts)
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Missing authorization header" });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    console.log("🔄 Starting Google Calendar sync for user:", user.id);

    // Get user's Google Calendar integration
    const { data: integration, error: integrationError } = await (supabaseAdmin as any)
      .from("user_integrations")
      .select("*")
      .eq("user_id", user.id)
      .eq("integration_type", "google_calendar")
      .eq("is_active", true)
      .single();

    if (integrationError || !integration) {
      return res.status(400).json({
        error: "Google Calendar not connected. Please connect your account first.",
      });
    }

    // Get valid access token (refresh if needed)
    const accessToken = await getValidAccessToken(integration);

    if (!accessToken) {
      return res.status(401).json({
        error: "Failed to get valid access token. Please reconnect your Google Calendar.",
      });
    }

    // Sync events from CRM to Google Calendar
    const { exportedCount } = await syncCRMToGoogle(user.id, accessToken);

    // Sync events from Google Calendar to CRM
    const { importedCount } = await syncGoogleToCRM(user.id, accessToken);

    console.log(`✅ Sync completed: ${exportedCount} exported, ${importedCount} imported`);

    return res.status(200).json({
      success: true,
      message: "Sync completed successfully",
      exported: exportedCount,
      imported: importedCount,
    });

  } catch (error: any) {
    console.error("❌ Error during Google Calendar sync:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}

// Helper to get valid Google access token
async function getValidAccessToken(integration: any): Promise<string | null> {
  const now = new Date();
  const expiryDate = new Date(integration.token_expiry);

  // If token is still valid, return it
  if (expiryDate > now) {
    return integration.access_token;
  }

  console.log("🔄 Access token expired, refreshing...");

  // Get OAuth credentials from settings
  const { data: settings, error } = await (supabaseAdmin as any)
    .from("integration_settings")
    .select("settings, is_active")
    .eq("integration_name", "google_calendar")
    .eq("is_active", true)
    .single();

  if (error || !settings) {
    console.error("Failed to get integration settings:", error);
    return null;
  }

  const { clientId, clientSecret } = settings.settings;

  // Refresh the token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: integration.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!tokenResponse.ok) {
    console.error("Failed to refresh token:", await tokenResponse.text());
    return null;
  }

  const tokens = await tokenResponse.json();
  const newExpiry = new Date(Date.now() + tokens.expires_in * 1000);

  // Update tokens in database
  await (supabaseAdmin as any)
    .from("user_integrations")
    .update({
      access_token: tokens.access_token,
      token_expiry: newExpiry.toISOString(),
    })
    .eq("user_id", integration.user_id)
    .eq("integration_type", "google_calendar");

  console.log("✅ Token refreshed successfully");
  return tokens.access_token;
}

// Sync CRM events to Google Calendar
async function syncCRMToGoogle(userId: string, accessToken: string) {
  let exportedCount = 0;

  // Get CRM events that need to be synced
  const { data: crmEvents } = await (supabaseAdmin as any)
    .from("calendar_events")
    .select("*")
    .eq("user_id", userId)
    .is("google_event_id", null);

  if (!crmEvents || crmEvents.length === 0) {
    console.log("No CRM events to export");
    return { exportedCount: 0 };
  }

  // Export each event to Google Calendar
  for (const event of crmEvents) {
    try {
      const googleEvent = {
        summary: event.title,
        description: event.description || "",
        start: {
          dateTime: event.start_time,
          timeZone: "UTC",
        },
        end: {
          dateTime: event.end_time,
          timeZone: "UTC",
        },
      };

      const response = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(googleEvent),
        }
      );

      if (response.ok) {
        const createdEvent = await response.json();
        await (supabaseAdmin as any)
          .from("calendar_events")
          .update({ google_event_id: createdEvent.id })
          .eq("id", event.id);
        exportedCount++;
      }
    } catch (error) {
      console.error(`Failed to export event ${event.id}:`, error);
    }
  }

  return { exportedCount };
}

// Sync Google Calendar events to CRM
async function syncGoogleToCRM(userId: string, accessToken: string) {
  let importedCount = 0;

  try {
    // Get events from Google Calendar
    const timeMin = new Date();
    timeMin.setMonth(timeMin.getMonth() - 1); // Last month

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${timeMin.toISOString()}&singleEvents=true&orderBy=startTime`,
      {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Google API error: ${response.statusText}`);
    }

    const data = await response.json();
    const googleEvents = data.items || [];

    // Import events that don't exist in CRM
    for (const googleEvent of googleEvents) {
      if (!googleEvent.start?.dateTime || !googleEvent.end?.dateTime) {
        continue; // Skip all-day events
      }

      // Check if event already exists
      const { data: existing } = await (supabaseAdmin as any)
        .from("calendar_events")
        .select("id")
        .eq("google_event_id", googleEvent.id)
        .single();

      if (!existing) {
        await (supabaseAdmin as any).from("calendar_events").insert({
          user_id: userId,
          title: googleEvent.summary || "Untitled Event",
          description: googleEvent.description,
          start_time: googleEvent.start.dateTime,
          end_time: googleEvent.end.dateTime,
          google_event_id: googleEvent.id,
        });
        importedCount++;
      }
    }
  } catch (error) {
    console.error("Failed to import from Google Calendar:", error);
  }

  return { importedCount };
}