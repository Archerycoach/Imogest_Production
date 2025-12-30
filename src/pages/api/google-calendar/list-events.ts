import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: "Missing access token" });
    }

    // Get events from Google Calendar (next 30 days)
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);

    const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    url.searchParams.append("timeMin", now.toISOString());
    url.searchParams.append("timeMax", futureDate.toISOString());
    url.searchParams.append("singleEvents", "true");
    url.searchParams.append("orderBy", "startTime");

    const response = await fetch(url.toString(), {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to fetch events");
    }

    const data = await response.json();

    res.status(200).json({
      success: true,
      events: data.items || [],
    });
  } catch (error) {
    console.error("Error fetching Google Calendar events:", error);
    res.status(500).json({
      error: "Failed to fetch Google Calendar events",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}