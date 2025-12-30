import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { accessToken, eventId } = req.body;

    if (!accessToken || !eventId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Delete event from Google Calendar
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok && response.status !== 404) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to delete event");
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error deleting Google Calendar event:", error);
    res.status(500).json({
      error: "Failed to delete Google Calendar event",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}