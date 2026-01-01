import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const envRedirectUri = process.env.GOOGLE_REDIRECT_URI;

  // Dynamic redirect URI detection
  const host = req.headers.host || "localhost:3000";
  const isLocalhost = host.includes("localhost") || host.includes("127.0.0.1");
  const isSoftgen = host.includes("softgen.dev");
  
  // Use http:// for localhost, https:// for everything else
  const protocol = isLocalhost ? "http" : "https";
  const dynamicRedirectUri = `${protocol}://${host}/api/google-calendar/callback`;

  const diagnostics = {
    status: clientId && clientSecret ? "configured" : "missing_credentials",
    environment: {
      protocol,
      host,
      dynamicRedirectUri,
      envRedirectUri: envRedirectUri || "not_set",
      isLocalhost,
      isSoftgen
    },
    credentials: {
      clientId: clientId || "NOT_SET",
      clientSecretConfigured: !!clientSecret,
      clientSecretLength: clientSecret?.length || 0
    },
    oauthUrl: clientId 
      ? `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(dynamicRedirectUri)}&response_type=code&scope=${encodeURIComponent("https://www.googleapis.com/auth/calendar")}&access_type=offline&prompt=consent`
      : "CLIENT_ID_NOT_SET",
    recommendations: [
      !clientId && "Set NEXT_PUBLIC_GOOGLE_CLIENT_ID in .env.local",
      !clientSecret && "Set GOOGLE_CLIENT_SECRET in .env.local",
      "Add redirect URI to Google Cloud Console: " + dynamicRedirectUri,
      "Ensure Google Calendar API is enabled in Google Cloud Console",
      "Configure OAuth Consent Screen in Google Cloud Console",
      "Add your email as a test user if app is in Testing mode"
    ].filter(Boolean)
  };

  return res.status(200).json(diagnostics);
}