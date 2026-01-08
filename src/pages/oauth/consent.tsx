import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

/**
 * OAuth Consent Page
 * This page handles the OAuth authorization flow for Supabase Auth
 * 
 * Flow:
 * 1. User is redirected here from OAuth provider (Google, etc.)
 * 2. We extract the authorization code from URL params
 * 3. We exchange the code for a session via Supabase
 * 4. We redirect user to the appropriate page
 */
export default function OAuthConsentPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Processando autorização...");

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Get the authorization code from URL params
        const { code, error, error_description } = router.query;

        // Check for OAuth errors
        if (error) {
          console.error("❌ OAuth error:", error, error_description);
          setStatus("error");
          setMessage(`Erro de autorização: ${error_description || error}`);
          setTimeout(() => router.push("/login"), 3000);
          return;
        }

        // If no code, wait for router to be ready
        if (!code) {
          console.log("⏳ Waiting for authorization code...");
          return;
        }

        console.log("🔐 Processing OAuth callback with code:", code);

        // Exchange the code for a session
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(
          code as string
        );

        if (exchangeError) {
          console.error("❌ Failed to exchange code for session:", exchangeError);
          setStatus("error");
          setMessage("Falha ao processar autorização. Por favor, tente novamente.");
          setTimeout(() => router.push("/login"), 3000);
          return;
        }

        if (!data.session) {
          console.error("❌ No session returned after code exchange");
          setStatus("error");
          setMessage("Falha ao criar sessão. Por favor, tente novamente.");
          setTimeout(() => router.push("/login"), 3000);
          return;
        }

        console.log("✅ OAuth session created successfully:", {
          userId: data.session.user.id,
          email: data.session.user.email,
          expiresAt: data.session.expires_at,
        });

        setStatus("success");
        setMessage("Autorização concluída! Redirecionando...");

        // Redirect to the page the user was trying to access
        const returnTo = sessionStorage.getItem("oauth_return_to") || "/dashboard";
        sessionStorage.removeItem("oauth_return_to");

        setTimeout(() => router.push(returnTo), 1000);
      } catch (error) {
        console.error("❌ Unexpected error in OAuth callback:", error);
        setStatus("error");
        setMessage("Erro inesperado. Por favor, tente novamente.");
        setTimeout(() => router.push("/login"), 3000);
      }
    };

    if (router.isReady) {
      handleOAuthCallback();
    }
  }, [router.isReady, router.query]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="text-center">
          {status === "loading" && (
            <>
              <Loader2 className="w-16 h-16 animate-spin text-blue-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Processando Autorização
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                {message}
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Autorização Concluída!
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                {message}
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-red-600 dark:text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Erro na Autorização
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                {message}
              </p>
            </>
          )}

          <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
            Será redirecionado automaticamente...
          </div>
        </div>
      </div>
    </div>
  );
}