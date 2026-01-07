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
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setLoading(false);
        return;
      }

      const response = await fetch("/api/google-calendar/status", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        console.error("Error checking connection status");
        setLoading(false);
        return;
      }

      const { isConnected } = await response.json();

      if (isConnected) {
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
      // Clean URL without reloading
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
      // Clean URL without reloading
      window.history.replaceState({}, "", window.location.pathname);
    }
  };

  const handleConnect = async () => {
    try {
      setConnecting(true);
      console.log("🔗 Connecting to Google Calendar...");

      // Check if user is logged in
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.error("❌ No session found");
        toast({
          title: "Erro",
          description: "Por favor faça login primeiro.",
          variant: "destructive",
        });
        setConnecting(false);
        return;
      }

      console.log("✅ Session found");
      console.log("📋 Session details:", {
        hasAccessToken: !!session.access_token,
        tokenLength: session.access_token?.length || 0,
        tokenPreview: session.access_token?.substring(0, 50) + "...",
        expiresAt: session.expires_at,
        user: session.user?.email
      });

      if (!session.access_token) {
        console.error("❌ No access token in session");
        toast({
          title: "Erro",
          description: "Token de autenticação não encontrado. Por favor faça login novamente.",
          variant: "destructive",
        });
        setConnecting(false);
        return;
      }

      const authUrl = `/api/google-calendar/auth?token=${session.access_token}`;
      console.log("🚀 Redirecting to:", authUrl.substring(0, 100) + "...");

      // Navigate to auth endpoint with token
      window.location.href = authUrl;
      
    } catch (error) {
      console.error("❌ Connect error:", error);
      toast({
        title: "Erro ao conectar",
        description: "Não foi possível conectar ao Google Calendar. Tente novamente.",
        variant: "destructive",
      });
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Sessão expirada. Por favor faça login novamente.");
        setLoading(false);
        return;
      }

      // Call disconnect API
      const response = await fetch("/api/google-calendar/disconnect", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to disconnect");
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
                ℹ️ Nota sobre configuração:
              </p>
              <p className="text-xs text-blue-700">
                As credenciais OAuth devem estar configuradas corretamente na base de dados (tabela integration_settings).
                <br />
                <a 
                  href="/GOOGLE_CALENDAR_SETUP.md" 
                  target="_blank" 
                  className="underline font-medium"
                >
                  Ver guia completo de configuração →
                </a>
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