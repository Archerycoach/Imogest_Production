import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useRouter } from "next/router";
import { Toaster } from "@/components/ui/toaster";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [sessionValidated, setSessionValidated] = useState(false);
  
  // Public routes that don't require authentication
  const publicRoutes = ["/login", "/register", "/forgot-password", "/"];
  const isPublicRoute = publicRoutes.includes(router.pathname);

  useEffect(() => {
    const validateSession = async () => {
      // Skip validation for public routes
      if (isPublicRoute) {
        setSessionValidated(true);
        return;
      }

      try {
        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession();

        // If no session or error, force logout and redirect to login
        if (!session || error) {
          console.log("❌ Invalid session detected, forcing logout...");
          await supabase.auth.signOut();
          router.push("/login");
          return;
        }

        // Validate session by trying to get user
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        // If user fetch fails, session is invalid
        if (!user || userError) {
          console.log("❌ Session validation failed, forcing logout...");
          await supabase.auth.signOut();
          router.push("/login");
          return;
        }

        console.log("✅ Session validated for user:", user.email);
        setSessionValidated(true);
      } catch (error) {
        console.error("❌ Session validation error:", error);
        await supabase.auth.signOut();
        router.push("/login");
      }
    };

    validateSession();
  }, [router.pathname]);

  // Show nothing while validating session (prevents flash of content)
  if (!isPublicRoute && !sessionValidated) {
    return (
      <ThemeProvider>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mx-auto mb-4"></div>
            <p className="text-sm text-gray-600 dark:text-gray-400">A validar sessão...</p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      {isPublicRoute ? (
        <Component {...pageProps} />
      ) : (
        <ProtectedRoute>
          <Component {...pageProps} />
        </ProtectedRoute>
      )}
      <Toaster />
    </ThemeProvider>
  );
}