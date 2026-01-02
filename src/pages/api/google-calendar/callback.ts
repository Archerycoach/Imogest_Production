import type { NextApiRequest, NextApiResponse } from "next";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const REDIRECT_URI = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || "http://localhost:3000/api/google-calendar/callback";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { code, error, error_description } = req.query;

    // Handle OAuth errors from Google
    if (error) {
      console.error("Google OAuth error:", error, error_description);
      const errorUrl = new URL("/settings", req.headers.origin || "http://localhost:3000");
      
      let errorMessage = "Erro ao conectar Google Calendar";
      
      if (error === "access_denied") {
        errorMessage = "Acesso negado. Por favor autorize o acesso ao calendário.";
      } else if (error_description) {
        errorMessage = String(error_description);
      }
      
      errorUrl.searchParams.append("google_error", errorMessage);
      return res.redirect(errorUrl.toString());
    }

    if (!code || typeof code !== "string") {
      console.error("No authorization code provided");
      return res.status(400).json({ error: "No authorization code provided" });
    }

    // Validate environment variables
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error("Missing Google OAuth credentials in environment variables");
      const errorUrl = new URL("/settings", req.headers.origin || "http://localhost:3000");
      errorUrl.searchParams.append("google_error", "Configuração OAuth incompleta. Verifique as variáveis de ambiente.");
      return res.redirect(errorUrl.toString());
    }

    console.log("Exchanging code for tokens...");
    
    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error("Token exchange failed:", errorData);
      
      let errorMessage = "Falha ao obter tokens do Google";
      
      if (errorData.error === "invalid_grant") {
        errorMessage = "Código de autorização inválido ou expirado. Tente novamente.";
      } else if (errorData.error === "invalid_client") {
        errorMessage = "Credenciais OAuth inválidas. Verifique Client ID e Secret.";
      } else if (errorData.error === "redirect_uri_mismatch") {
        errorMessage = "Redirect URI não corresponde. Verifique configuração no Google Cloud.";
      }
      
      const errorUrl = new URL("/settings", req.headers.origin || "http://localhost:3000");
      errorUrl.searchParams.append("google_error", errorMessage);
      return res.redirect(errorUrl.toString());
    }

    const tokens = await tokenResponse.json();
    
    console.log("Tokens received successfully");

    // Redirect back to settings with tokens in URL
    const redirectUrl = new URL("/settings", req.headers.origin || "http://localhost:3000");
    redirectUrl.searchParams.append("google_access_token", tokens.access_token);
    redirectUrl.searchParams.append("google_refresh_token", tokens.refresh_token || "");
    redirectUrl.searchParams.append("google_expires_at", String(Date.now() + tokens.expires_in * 1000));
    redirectUrl.searchParams.append("google_connected", "true");

    res.redirect(redirectUrl.toString());
  } catch (error) {
    console.error("Error in Google OAuth callback:", error);
    const errorUrl = new URL("/settings", req.headers.origin || "http://localhost:3000");
    errorUrl.searchParams.append("google_error", "Erro inesperado ao conectar. Tente novamente.");
    res.redirect(errorUrl.toString());
  }
}