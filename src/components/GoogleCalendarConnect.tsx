import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { checkConnection } from "@/services/googleCalendarService";

export function GoogleCalendarConnect() {
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const { toast } = useToast();

  const checkStatus = async () => {
    try {
      const { data: { session } } = await import("@/integrations/supabase/client").then(m => m.supabase.auth.getSession());
      if (!session?.user) return;

      // We need to call an API or Server Action to check status securely
      // For now, we'll assume the client-side service wrapper works if configured correctly,
      // but ideally this check happens server-side.
      // Let's use the API route we created for sync/check if possible, or just check the integration record via Supabase client directly
      
      const { data, error } = await import("@/integrations/supabase/client").then(m => 
        m.supabase
          .from("user_integrations")
          .select("last_sync, is_active")
          .eq("user_id", session.user.id)
          .eq("integration_type", "google_calendar")
          .eq("is_active", true)
          .maybeSingle()
      );

      if (data) {
        setIsConnected(true);
        setLastSync(data.last_sync);
      } else {
        setIsConnected(false);
      }
    } catch (error) {
      console.error("Error checking status:", error);
    } finally {
      setCheckingStatus(false);
    }
  };

  useEffect(() => {
    checkStatus();
    
    // Check for success/error params in URL
    const params = new URLSearchParams(window.location.search);
    if (params.get("calendar_success")) {
      toast({
        title: "Conectado com sucesso",
        description: "O Google Calendar foi integrado corretamente.",
        className: "bg-green-50 border-green-200"
      });
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
      checkStatus();
    }
    if (params.get("calendar_error")) {
      toast({
        variant: "destructive",
        title: "Erro na conexão",
        description: "Não foi possível conectar ao Google Calendar."
      });
    }
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/google-calendar/auth");
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No auth URL returned");
      }
    } catch (error) {
      console.error("Error connecting:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao iniciar conexão com Google."
      });
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/google-calendar/disconnect", { method: "POST" });
      if (response.ok) {
        setIsConnected(false);
        setLastSync(null);
        toast({
          title: "Desconectado",
          description: "A integração foi removida com sucesso."
        });
      }
    } catch (error) {
      console.error("Error disconnecting:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao desconectar."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/google-calendar/sync", { method: "POST" });
      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "Sincronização concluída",
          description: data.message || "Eventos sincronizados com sucesso."
        });
        checkStatus();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Sync error:", error);
      toast({
        variant: "destructive",
        title: "Erro na sincronização",
        description: "Não foi possível sincronizar os eventos."
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingStatus) {
    return (
      <Card>
        <CardContent className="pt-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            <CardTitle>Google Calendar</CardTitle>
          </div>
          {isConnected ? (
            <Badge className="bg-green-500 hover:bg-green-600">Conectado</Badge>
          ) : (
            <Badge variant="outline">Não conectado</Badge>
          )}
        </div>
        <CardDescription>
          Sincronize seus eventos do CRM com o Google Calendar automaticamente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-md border border-green-100 dark:bg-green-900/20 dark:border-green-900">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-900 dark:text-green-100">Integração Ativa</h4>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Seus eventos estão sendo sincronizados.
                    {lastSync && (
                      <span className="block mt-1 text-xs opacity-75">
                        Última sincronização: {new Date(lastSync).toLocaleString()}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={handleSync} 
                disabled={loading}
                className="flex-1"
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Sincronizar Agora
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDisconnect} 
                disabled={loading}
                className="flex-1"
              >
                Desconectar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
              <p className="text-sm text-muted-foreground mb-4">
                Conecte sua conta Google para:
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Sincronizar agendamentos do CRM
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Importar reuniões do Google Calendar
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Evitar conflitos de horário
                </li>
              </ul>
            </div>
            
            <Button onClick={handleConnect} disabled={loading} className="w-full">
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <img src="https://www.google.com/favicon.ico" alt="Google" className="mr-2 h-4 w-4" />
              )}
              Conectar com Google
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}