import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getCurrentSession } from "@/services/authService";
import { getCurrentUserRole } from "@/lib/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[]; // Add this prop
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  useEffect(() => {
    console.log("ProtectedRoute: Starting auth check...");
    checkAuth();
  }, [router.pathname]);

  const checkAuth = async () => {
    console.log(`ProtectedRoute: Checking auth (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
    
    try {
      const session = await getCurrentSession();
      
      if (!session) {
        console.log("ProtectedRoute: No session found");
        
        // Retry logic para falhas de rede
        if (retryCount < MAX_RETRIES) {
          console.log(`ProtectedRoute: Retrying in 1 second... (${retryCount + 1}/${MAX_RETRIES})`);
          setRetryCount(prev => prev + 1);
          setTimeout(() => checkAuth(), 1000);
          return;
        }
        
        console.log("ProtectedRoute: Max retries reached, redirecting to login");
        router.push("/login");
        return;
      }

      console.log("ProtectedRoute: Session valid, checking role...");

      // Check role if specified
      if (allowedRoles && allowedRoles.length > 0) {
        const userRole = await getCurrentUserRole();
        console.log("ProtectedRoute: User role:", userRole);
        
        if (!userRole || !allowedRoles.includes(userRole)) {
          console.log("ProtectedRoute: Unauthorized role, redirecting to dashboard");
          router.push("/dashboard");
          return;
        }
      }

      console.log("ProtectedRoute: Auth check passed ✓");
      setAuthorized(true);
      setLoading(false);
    } catch (error) {
      console.error("ProtectedRoute: Error checking auth:", error);
      
      // Retry em caso de erro
      if (retryCount < MAX_RETRIES) {
        console.log(`ProtectedRoute: Error occurred, retrying... (${retryCount + 1}/${MAX_RETRIES})`);
        setRetryCount(prev => prev + 1);
        setTimeout(() => checkAuth(), 1000);
        return;
      }
      
      console.log("ProtectedRoute: Max retries reached after error, redirecting to login");
      router.push("/login");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">A verificar autenticação...</p>
          {retryCount > 0 && (
            <p className="text-sm text-gray-500 mt-2">
              Tentativa {retryCount}/{MAX_RETRIES}
            </p>
          )}
        </div>
      </div>
    );
  }

  return authorized ? <>{children}</> : null;
}