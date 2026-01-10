import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Verify admin access
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Check if user is admin
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return res.status(403).json({ error: "Forbidden - Admin access required" });
    }

    if (req.method === "GET") {
      // Get Google Calendar settings
      const { data, error } = await supabaseAdmin
        .from("integration_settings")
        .select("*")
        .eq("integration_name", "google_calendar")
        .maybeSingle();

      if (error) {
        throw error;
      }

      // Transform for frontend
      if (data) {
        const settings = data.settings as any;
        return res.status(200).json({
          id: data.id,
          service_name: data.integration_name,
          enabled: data.is_active,
          client_id: settings?.client_id || "",
          client_secret: settings?.client_secret || "",
        });
      }

      return res.status(200).json(null);
    }

    if (req.method === "PUT") {
      // Update Google Calendar settings
      const { client_id, client_secret, enabled } = req.body;

      // Check if exists
      const { data: existing } = await supabaseAdmin
        .from("integration_settings")
        .select("id")
        .eq("integration_name", "google_calendar")
        .maybeSingle();

      let result;

      if (existing) {
        const { data, error } = await supabaseAdmin
          .from("integration_settings")
          .update({
            is_active: enabled,
            settings: {
              client_id,
              client_secret,
              scopes: ["https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/calendar.events"],
              redirect_uri: "/api/google-calendar/callback"
            },
            updated_at: new Date().toISOString(),
          })
          .eq("integration_name", "google_calendar")
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await supabaseAdmin
          .from("integration_settings")
          .insert({
            integration_name: "google_calendar",
            is_active: enabled,
            settings: {
              client_id,
              client_secret,
              scopes: ["https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/calendar.events"],
              redirect_uri: "/api/google-calendar/callback"
            }
          })
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      const settings = result.settings as any;
      return res.status(200).json({
        id: result.id,
        service_name: result.integration_name,
        enabled: result.is_active,
        client_id: settings?.client_id || "",
        client_secret: settings?.client_secret || "",
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Error in Google Calendar settings API:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}