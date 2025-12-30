import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import { useRouter } from "next/router";
import { Toaster } from "@/components/ui/toaster";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  
  // Public routes that don't require authentication
  const publicRoutes = ["/login", "/register", "/forgot-password", "/"];
  const isPublicRoute = publicRoutes.includes(router.pathname);

  return (
    <ThemeProvider>
      {/* 
        We use ProtectedRoute to wrap the application content.
        This ensures:
        1. Authentication check is performed
        2. Unauthenticated users are redirected to login
        3. Authenticated users see the Layout (sidebar + content)
      */}
      {isPublicRoute ? (
        <Component {...pageProps} />
      ) : (
        <ProtectedRoute>
          <Layout>
            <Component {...pageProps} />
          </Layout>
        </ProtectedRoute>
      )}
      <Toaster />
    </ThemeProvider>
  );
}