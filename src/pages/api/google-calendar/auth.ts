import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthUrl } from "@/services/googleCalendarService";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const authUrl = getAuthUrl();
    return res.status(200).json({ url: authUrl });
  } catch (error) {
    console.error("Error generating Google Calendar auth URL:", error);
    return res.status(500).json({ 
      error: "Failed to generate authorization URL",
      details: (error as Error).message 
    });
  }
}