import type { NextApiRequest, NextApiResponse } from "next";
import { google } from "googleapis";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: "Google Calendar credentials not configured" });
    }

    // Dynamic redirect URI detection based on request host
    const host = req.headers.host || "localhost:3000";
    const isLocalhost = host.includes("localhost") || host.includes("127.0.0.1");
    
    // Use http:// for localhost, https:// for everything else
    const protocol = isLocalhost ? "http" : "https";
    const redirectUri = `${protocol}://${host}/api/google-calendar/callback`;

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/calendar"],
      prompt: "consent"
    });

    return res.redirect(authUrl);
  } catch (error) {
    console.error("Error initiating Google OAuth:", error);
    return res.status(500).json({
      error: "Failed to initiate Google OAuth",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}