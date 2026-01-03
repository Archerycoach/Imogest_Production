import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@supabase/supabase-js";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "DELETE") {
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

    const { googleEventId } = req.body;

    if (!googleEventId) {
      return res.status(400).json({ error: "Missing googleEventId" });
    }

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${integration.access_token}`,
        },
      }
    );

    if (!response.ok && response.status !== 404) {
      const errorData = await response.text();
      console.error("Failed to delete Google Calendar event:", errorData);
      return res.status(response.status).json({ error: "Failed to delete event from Google Calendar" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting Google Calendar event:", error);
    res.status(500).json({ error: "Failed to delete event from Google Calendar" });
  }
}