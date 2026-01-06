import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Calendar, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface GoogleCalendarConnectProps {
  isConnected?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function GoogleCalendarConnect({ 
  isConnected: propConnected, 
  onConnect, 
  onDisconnect 
}: GoogleCalendarConnectProps = {}) {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (propConnected !== undefined) {
      setConnected(propConnected);
      setLoading(false);
    } else {
      checkConnection();
    }
  }, [propConnected]);

  useEffect(() => {
    handleCallback();
  }, []);

  const checkConnection = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_integrations")
        .select("is_active")
        .eq("user_id", user.id)
        .eq("integration_type", "google_calendar")
        .maybeSingle();

      if (error) {
        console.error("Error checking connection:", error);
        setLoading(false);
        return;
      }

      if (data?.is_active) {
        setConnected(true);
        if (onConnect) onConnect();
      }

      setLoading(false);
    } catch (error) {
      console.error("Error in checkConnection:", error);
      setLoading(false);
    }
  };

  const handleCallback = async () => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const callbackError = params.get("error");

    if (success === "google_calendar_connected") {
      setConnected(true);
      if (onConnect) onConnect();
      toast({
        title: "Google Calendar conectado!",
        description: "Sua conta foi conectada com sucesso.",
      });
      window.history.replaceState({}, "", window.location.pathname);
    }

    if (callbackError) {
      let errorMessage = "Erro ao conectar ao Google Calendar";
      
      switch (callbackError) {
        case "oauth_failed":
          errorMessage = "Erro na autenticação OAuth";
          break;
        case "no_code":
          errorMessage = "Código de autorização não recebido";
          break;
        case "no_state":
          errorMessage = "Parâmetro de estado não recebido";
          break;
        case "invalid_state":
          errorMessage = "Estado inválido na resposta OAuth";
          break;
        case "no_credentials":
          errorMessage = "Credenciais do Google Calendar não configuradas";
          break;
        case "token_exchange_failed":
          errorMessage = "Falha ao trocar código por tokens";
          break;
        case "storage_failed":
          errorMessage = "Falha ao armazenar tokens";
          break;
        case "callback_failed":
          errorMessage = "Erro no callback OAuth";
          break;
      }

      setError(errorMessage);
      toast({
        title: "Erro de conexão",
        description: errorMessage,
        variant: "destructive",
      });
      window.history.replaceState({}, "", window.location.pathname);
    }
  };

  const handleConnect = async () => {
    try {
      console.log("🔵 [1/6] Iniciando conexão Google Calendar...");
      setConnecting(true);
      setError(null);
      
      // Get current session
      console.log("🔵 [2/6] Obtendo sessão do Supabase...");
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error("❌ Erro na sessão:", sessionError);
        setError("Sessão expirada. Por favor faça login novamente.");
        setConnecting(false);
        return;
      }

      console.log("✅ [2/6] Sessão obtida com sucesso!");
      console.log("🔵 [3/6] Chamando /api/google-calendar/auth...");

      // Call the auth endpoint with authorization header
      const response = await fetch("/api/google-calendar/auth", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("✅ [3/6] Response recebida:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      if (!response.ok) {
        console.error("❌ Response não OK!");
        const errorData = await response.json();
        console.error("❌ Erro do servidor:", errorData);
        throw new Error(errorData.error || "Erro ao iniciar OAuth");
      }

      console.log("🔵 [4/6] Parsing JSON response...");
      const data = await response.json();
      console.log("✅ [4/6] JSON parsed com sucesso:", data);
      
      if (!data.url) {
        console.error("❌ URL não recebida na resposta!");
        throw new Error("URL de autorização não recebida");
      }

      console.log("✅ [5/6] URL do Google OAuth recebida!");
      console.log("🔵 [6/6] Redirecionando para Google...");
      console.log("🔗 URL:", data.url);
      
      // Redirect to Google OAuth
      window.location.href = data.url;
      
      console.log("✅ [6/6] Redirect iniciado! (aguardando navegador...)");
    } catch (err) {
      console.error("❌ ERRO FATAL no handleConnect:", err);
      console.error("❌ Stack trace:", err instanceof Error ? err.stack : "N/A");
      setError(err instanceof Error ? err.message : "Erro ao conectar. Tente novamente.");
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError("Sessão expirada. Por favor faça login novamente.");
        setLoading(false);
        return;
      }

      // Deactivate the integration
      const { error: updateError } = await supabase
        .from("user_integrations")
        .update({ is_active: false })
        .eq("user_id", user.id)
        .eq("integration_type", "google_calendar");

      if (updateError) {
        throw updateError;
      }

      setConnected(false);
      if (onDisconnect) onDisconnect();
      setError(null);
      
      toast({
        title: "Google Calendar desconectado",
        description: "Sua conta foi desconectada com sucesso.",
      });

      setLoading(false);
    } catch (err) {
      console.error("Error disconnecting:", err);
      setError("Erro ao desconectar. Tente novamente.");
      setLoading(false);
    }
  };

  if (loading && propConnected === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Google Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <p className="text-sm text-gray-500">A carregar...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Google Calendar
        </CardTitle>
        <CardDescription>
          Sincronize sua agenda com o Google Calendar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {connected ? (
          <div className="space-y-4">
            <Badge className="bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Conectado e sincronizado
            </Badge>
            
            <div className="text-sm text-gray-600">
              <p>✓ Eventos do CRM sincronizam automaticamente</p>
              <p>✓ Eventos do Google podem ser importados</p>
              <p>✓ Alertas de aniversário sincronizados</p>
            </div>

            <Button 
              variant="destructive" 
              onClick={handleDisconnect}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  A desconectar...
                </>
              ) : (
                "Desconectar Google Calendar"
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Conecte sua conta Google para sincronizar eventos automaticamente entre o CRM e o Google Calendar.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800 font-medium mb-2">
                ℹ️ Debug Mode Ativado - Verifique o console (F12)
              </p>
              <p className="text-xs text-blue-700">
                Os logs detalhados vão aparecer no console do browser durante a conexão.
              </p>
            </div>

            <Button 
              onClick={handleConnect} 
              className="w-full"
              disabled={connecting}
            >
              {connecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  A conectar...
                </>
              ) : (
                "Conectar Google Calendar"
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}