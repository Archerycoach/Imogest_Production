import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getCurrentSubscription } from "@/services/subscriptionService";
import { getUserProfile } from "@/services/profileService";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CreditCard, Lock, CheckCircle2 } from "lucide-react";

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }

      // Get user profile to check role
      const profileData = await getUserProfile();
      setProfile(profileData);

      // ✅ ADMINS BYPASS SUBSCRIPTION CHECK
      if (profileData && (profileData.role === "admin" || profileData.role === "team_lead")) {
        setHasAccess(true);
        setLoading(false);
        return;
      }

      // For non-admins, check subscription
      const subscription = await getCurrentSubscription(user.id);
      
      if (!subscription || subscription.status !== "active") {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      setHasAccess(true);
    } catch (error) {
      console.error("Error checking subscription:", error);
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Admin and Team Lead bypass subscription check
  if (profile && (profile.role === "admin" || profile.role === "team_lead")) {
    return <>{children}</>;
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <CardTitle className="text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-amber-600" />
              </div>
              Subscrição Necessária
            </CardTitle>
            <CardDescription className="text-center">
              Esta funcionalidade requer uma subscrição ativa do Imogest CRM.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">
                Benefícios da Subscrição:
              </h4>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Gestão ilimitada de leads e propriedades</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Pipeline visual e relatórios avançados</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Sincronização com Google Calendar</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Suporte prioritário</span>
                </li>
              </ul>
            </div>
            
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => router.push("/subscription")}
            >
              Ver Planos de Subscrição
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => router.push("/dashboard")}
            >
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}