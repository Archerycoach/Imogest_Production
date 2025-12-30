import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useRouter } from "next/router";
import { Toaster } from "@/components/ui/toaster";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  
  // Public routes that don't require authentication
  const publicRoutes = ["/login", "/register", "/forgot-password", "/"];
  const isPublicRoute = publicRoutes.includes(router.pathname);

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