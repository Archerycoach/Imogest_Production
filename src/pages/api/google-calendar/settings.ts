import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log("[Settings API] Request method:", req.method);

    // Create Supabase admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get session from cookies (Next.js handles this automatically)
    const token = req.cookies["sb-access-token"] || req.cookies["sb-localhost-auth-token"];
    
    if (!token) {
      console.error("[Settings API] No session token in cookies");
      return res.status(401).json({ error: "Unauthorized", details: "No session token" });
    }

    // Verify the token and get user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error("[Settings API] Invalid session:", userError?.message);
      return res.status(401).json({ error: "Unauthorized", details: "Invalid session" });
    }

    console.log("[Settings API] User authenticated:", user.id);

    // Check if user is admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "admin") {
      console.error("[Settings API] User is not admin:", { userId: user.id, role: profile?.role });
      return res.status(403).json({ error: "Forbidden", details: "Admin access required" });
    }

    console.log("[Settings API] Admin access confirmed");

    if (req.method === "GET") {
      console.log("[Settings API] Fetching settings from database");
      
      const { data, error } = await supabaseAdmin
        .from("integration_settings" as any)
        .select("*")
        .eq("service_name", "google_calendar")
        .maybeSingle();

      if (error) {
        console.error("[Settings API] Database error:", error);
        return res.status(500).json({ error: "Database error", details: error.message });
      }

      console.log("[Settings API] Settings found:", !!data);

      // If no settings exist, return default values
      if (!data) {
        return res.status(200).json({
          service_name: "google_calendar",
          enabled: false,
          client_id: "",
          client_secret: "",
          redirect_uri: "",
          scopes: "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events",
        });
      }

      const settings = data as any;

      // Return settings
      return res.status(200).json({
        service_name: settings.service_name,
        enabled: settings.enabled || false,
        client_id: settings.client_id || "",
        client_secret: settings.client_secret || "",
        redirect_uri: settings.redirect_uri || "",
        scopes: settings.scopes || "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events",
      });
    }

    if (req.method === "PUT") {
      const { client_id, client_secret, redirect_uri, scopes, enabled } = req.body;

      console.log("[Settings API] Updating settings");

      // Check if settings already exist
      const { data: existing } = await supabaseAdmin
        .from("integration_settings" as any)
        .select("id")
        .eq("service_name", "google_calendar")
        .maybeSingle();

      if (existing) {
        // Update existing settings
        const { error } = await supabaseAdmin
          .from("integration_settings" as any)
          .update({
            client_id: client_id || null,
            client_secret: client_secret || null,
            redirect_uri: redirect_uri || null,
            scopes: scopes || null,
            enabled: enabled || false,
            updated_at: new Date().toISOString(),
          })
          .eq("service_name", "google_calendar");

        if (error) {
          console.error("[Settings API] Update error:", error);
          return res.status(500).json({ error: "Failed to update settings", details: error.message });
        }

        console.log("[Settings API] Settings updated successfully");
        return res.status(200).json({ success: true, message: "Settings updated successfully" });
      } else {
        // Create new settings
        const { error } = await supabaseAdmin
          .from("integration_settings" as any)
          .insert({
            service_name: "google_calendar",
            client_id: client_id || null,
            client_secret: client_secret || null,
            redirect_uri: redirect_uri || null,
            scopes: scopes || null,
            enabled: enabled || false,
          });

        if (error) {
          console.error("[Settings API] Insert error:", error);
          return res.status(500).json({ error: "Failed to create settings", details: error.message });
        }

        console.log("[Settings API] Settings created successfully");
        return res.status(201).json({ success: true, message: "Settings created successfully" });
      }
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("[Settings API] Unexpected error:", error);
    return res.status(500).json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : "Unknown error" 
    });
  }
}