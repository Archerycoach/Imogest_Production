import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@supabase/supabase-js";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "PATCH" && req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false
        }
      }
    );

    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "");
    
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { data: integration, error: integrationError } = await supabaseAdmin
      .from("user_integrations")
      .select("access_token")
      .eq("user_id", user.id)
      .eq("integration_type", "google_calendar")
      .eq("is_active", true)
      .single();

    if (integrationError || !integration) {
      return res.status(400).json({ error: "Google Calendar not connected" });
    }

    const { googleEventId, event } = req.body;

    if (!googleEventId || !event) {
      return res.status(400).json({ error: "Missing googleEventId or event data" });
    }

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${integration.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: event.summary,
          description: event.description || "",
          location: event.location || "",
          start: {
            dateTime: event.start,
            timeZone: "Europe/Lisbon",
          },
          end: {
            dateTime: event.end,
            timeZone: "Europe/Lisbon",
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Failed to update Google Calendar event:", errorData);
      return res.status(response.status).json({ error: "Failed to update event in Google Calendar" });
    }

    const googleEvent = await response.json();

    res.json({ 
      success: true,
      googleEventId: googleEvent.id
    });
  } catch (error) {
    console.error("Error updating Google Calendar event:", error);
    res.status(500).json({ error: "Failed to update event in Google Calendar" });
  }
}