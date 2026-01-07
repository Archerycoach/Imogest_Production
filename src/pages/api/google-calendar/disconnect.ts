import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get user from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Missing authorization header" });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    console.log("🔌 Disconnecting Google Calendar for user:", user.id);

    // Deactivate the integration
    const { error: updateError } = await (supabaseAdmin as any)
      .from("user_integrations")
      .update({ is_active: false })
      .eq("user_id", user.id)
      .eq("integration_type", "google_calendar");

    if (updateError) {
      console.error("Error disconnecting Google Calendar:", updateError);
      return res.status(500).json({ error: "Failed to disconnect" });
    }

    console.log("✅ Google Calendar disconnected successfully");
    return res.status(200).json({ success: true });

  } catch (error: any) {
    console.error("Error in Google Calendar disconnect:", error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : "Internal server error" 
    });
  }
}