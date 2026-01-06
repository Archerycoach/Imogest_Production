import type { NextApiRequest, NextApiResponse } from "next";
import { disconnectGoogleCalendar } from "@/services/googleCalendarService";
import { createPagesServerClient } from "@/lib/supabase-server";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get authenticated user
    const supabase = createPagesServerClient({ req, res });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Disconnect Google Calendar
    await disconnectGoogleCalendar(session.user.id);

    return res.status(200).json({
      success: true,
      message: "Google Calendar disconnected successfully"
    });
  } catch (error) {
    console.error("Error disconnecting Google Calendar:", error);
    return res.status(500).json({
      error: "Failed to disconnect Google Calendar",
      details: (error as Error).message
    });
  }
}