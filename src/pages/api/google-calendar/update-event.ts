import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { accessToken, eventId, event } = req.body;

    if (!accessToken || !eventId || !event) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Update event in Google Calendar
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to update event");
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error updating Google Calendar event:", error);
    res.status(500).json({
      error: "Failed to update Google Calendar event",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}