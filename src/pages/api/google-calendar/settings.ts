import { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin, validateSupabaseAdmin } from "@/lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log(`[Settings API] ${req.method} request received`);

    // Validate supabaseAdmin configuration
    const validation = validateSupabaseAdmin();
    if (!validation.isValid) {
      console.error("[Settings API] SupabaseAdmin validation failed:", validation.error);
      return res.status(500).json({ 
        error: "Server configuration error", 
        details: validation.error 
      });
    }

    if (req.method === "GET") {
      // Get Google Calendar integration settings
      const { data, error } = await supabaseAdmin
        .from("integration_settings" as any)
        .select("*")
        .eq("service_name", "google_calendar")
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("[Settings API] Database error:", error);
        return res.status(500).json({ error: "Database error", details: error.message });
      }

      // If no settings exist, return default values
      if (!data) {
        console.log("[Settings API] No settings found, returning defaults");
        return res.status(200).json({
          enabled: false,
          clientId: "",
          clientSecret: "",
          redirectUri: "",
          scopes: "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events",
        });
      }

      const typedData = data as any;
      console.log("[Settings API] Settings loaded successfully");

      return res.status(200).json({
        enabled: typedData.enabled || false,
        clientId: typedData.client_id || "",
        clientSecret: typedData.client_secret || "",
        redirectUri: typedData.redirect_uri || "",
        scopes: Array.isArray(typedData.scopes) ? typedData.scopes.join(" ") : "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events",
      });
    }

    if (req.method === "PUT") {
      const { clientId, clientSecret, redirectUri, scopes, enabled } = req.body;

      console.log("[Settings API] Updating settings:", { 
        enabled, 
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
        hasRedirectUri: !!redirectUri 
      });

      // Convert scopes string to array
      const scopesArray = scopes ? scopes.split(" ").filter((s: string) => s.trim()) : null;

      // Check if settings already exist
      const { data: existing } = await supabaseAdmin
        .from("integration_settings" as any)
        .select("id")
        .eq("service_name", "google_calendar")
        .single();

      if (existing) {
        // Update existing settings
        const { error } = await supabaseAdmin
          .from("integration_settings" as any)
          .update({
            client_id: clientId || null,
            client_secret: clientSecret || null,
            redirect_uri: redirectUri || null,
            scopes: scopesArray,
            enabled: enabled || false,
            updated_at: new Date().toISOString(),
          })
          .eq("service_name", "google_calendar");

        if (error) {
          console.error("[Settings API] Update error:", error);
          return res.status(500).json({ error: "Failed to update settings", details: error.message });
        }

        console.log("[Settings API] Settings updated successfully");
      } else {
        // Insert new settings
        const { error } = await supabaseAdmin
          .from("integration_settings" as any)
          .insert({
            service_name: "google_calendar",
            client_id: clientId || null,
            client_secret: clientSecret || null,
            redirect_uri: redirectUri || null,
            scopes: scopesArray,
            enabled: enabled || false,
          });

        if (error) {
          console.error("[Settings API] Insert error:", error);
          return res.status(500).json({ error: "Failed to create settings", details: error.message });
        }

        console.log("[Settings API] Settings created successfully");
      }

      return res.status(200).json({ success: true });
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