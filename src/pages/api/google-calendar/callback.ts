import type { NextApiRequest, NextApiResponse } from "next";
import { exchangeCodeForTokens, storeTokens } from "@/services/googleCalendarService";
import { createPagesServerClient } from "@/lib/supabase-server";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { code, error } = req.query;

  if (error) {
    console.error("OAuth error:", error);
    return res.redirect("/settings?calendar_error=oauth_denied");
  }

  if (!code || typeof code !== "string") {
    return res.redirect("/settings?calendar_error=no_code");
  }

  try {
    // Get authenticated user
    const supabase = createPagesServerClient({ req, res });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return res.redirect("/login?error=unauthorized");
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Store tokens in database
    await storeTokens(session.user.id, tokens);

    // Redirect to settings with success message
    return res.redirect("/admin/integrations?calendar_success=true");
  } catch (error) {
    console.error("Error in Google Calendar callback:", error);
    return res.redirect("/admin/integrations?calendar_error=token_exchange_failed");
  }
}