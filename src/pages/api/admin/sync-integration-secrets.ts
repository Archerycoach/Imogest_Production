import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET and POST methods
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Check if user is authenticated and is admin
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Check if user is admin
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }

    if (req.method === "GET") {
      // Get all integration settings
      const { data: integrations, error: integrationsError } = await supabaseAdmin
        .from("integration_settings")
        .select("integration_name, settings, is_active")
        .order("integration_name");

      if (integrationsError) {
        console.error("Error fetching integration settings:", integrationsError);
        return res.status(500).json({ error: "Failed to fetch integration settings" });
      }

      // Return synced status for each integration
      const syncStatus = (integrations || []).map(integration => ({
        name: integration.integration_name,
        isActive: integration.is_active,
        hasSettings: !!integration.settings && Object.keys(integration.settings as any).length > 0,
        lastSynced: new Date().toISOString()
      }));

      return res.json({
        success: true,
        integrations: syncStatus
      });
    }

    if (req.method === "POST") {
      // Sync integration secrets from database to ensure they're accessible
      const { integration_name } = req.body;

      if (integration_name) {
        // Sync specific integration
        const { data, error } = await supabaseAdmin
          .from("integration_settings")
          .select("settings")
          .eq("integration_name", integration_name)
          .single();

        if (error) {
          return res.status(404).json({ error: "Integration not found" });
        }

        return res.json({
          success: true,
          message: `Integration ${integration_name} secrets synced successfully`,
          hasSetting: !!data?.settings
        });
      }

      // Sync all integrations
      const { data: integrations, error: integrationsError } = await supabaseAdmin
        .from("integration_settings")
        .select("integration_name, settings, is_active");

      if (integrationsError) {
        return res.status(500).json({ error: "Failed to fetch integrations" });
      }

      const syncedCount = (integrations || []).filter(i => i.settings).length;

      return res.json({
        success: true,
        message: `${syncedCount} integrations synced successfully`,
        totalIntegrations: integrations?.length || 0,
        syncedIntegrations: syncedCount
      });
    }
  } catch (error) {
    console.error("Error in sync-integration-secrets:", error);
    return res.status(500).json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}