import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getCurrentSession } from "@/services/authService";
import { getCurrentUserRole } from "@/lib/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        const session = await getCurrentSession();
        
        if (!mounted) return;

        if (!session) {
          router.push("/login");
          return;
        }

        // Check role if specified
        if (allowedRoles && allowedRoles.length > 0) {
          const userRole = await getCurrentUserRole();
          
          if (!mounted) return;
          
          if (!userRole || !allowedRoles.includes(userRole)) {
            router.push("/dashboard");
            return;
          }
        }

        if (mounted) {
          setAuthorized(true);
          setLoading(false);
        }
      } catch (error) {
        console.error("ProtectedRoute: Auth error:", error);
        if (mounted) {
          router.push("/login");
        }
      }
    };

    checkAuth();

    return () => {
      mounted = false;
    };
  }, [router.pathname, allowedRoles]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">A verificar autenticação...</p>
        </div>
      </div>
    );
  }

  return authorized ? <>{children}</> : null;
}