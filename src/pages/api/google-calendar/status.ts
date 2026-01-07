import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
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

    // Check if user has Google Calendar connected
    const { data: integration, error: integrationError } = await (supabaseAdmin as any)
      .from("user_integrations")
      .select("is_active, token_expiry")
      .eq("user_id", user.id)
      .eq("integration_type", "google_calendar")
      .maybeSingle();

    if (integrationError) {
      console.error("Error checking Google Calendar status:", integrationError);
      return res.status(500).json({ error: "Failed to check connection status" });
    }

    const isConnected = !!integration?.is_active;
    const tokenExpiry = integration?.token_expiry || null;

    return res.status(200).json({ 
      isConnected,
      tokenExpiry 
    });

  } catch (error: any) {
    console.error("Error in Google Calendar status check:", error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : "Internal server error" 
    });
  }
}