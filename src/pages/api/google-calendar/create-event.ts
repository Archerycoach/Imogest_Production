import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { accessToken, event } = req.body;

    if (!accessToken || !event) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Create event in Google Calendar
    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to create event");
    }

    const googleEvent = await response.json();

    res.status(200).json({
      success: true,
      googleEventId: googleEvent.id,
    });
  } catch (error) {
    console.error("Error creating Google Calendar event:", error);
    res.status(500).json({
      error: "Failed to create Google Calendar event",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}