import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, CheckCircle, XCircle, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SessionManager } from "@/lib/sessionManager";
import { useSessionRefresh } from "@/hooks/useSessionRefresh";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";

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
  const { toast } = useToast();
  const router = useRouter();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [isValidatingSession, setIsValidatingSession] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Enable automatic session refresh
  useSessionRefresh();

  useEffect(() => {
    if (propConnected !== undefined) {
      setIsConnected(propConnected);
      setIsLoading(false);
    } else {
      checkConnection();
    }
  }, [propConnected]);

  useEffect(() => {
    handleCallback();
  }, []);

  const checkConnection = async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setIsLoading(false);
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
        setIsLoading(false);
        return;
      }

      const { isConnected } = await response.json();

      if (isConnected) {
        setIsConnected(true);
        if (onConnect) onConnect();
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error("Error in checkConnection:", error);
      setIsLoading(false);
    }
  };

  const handleCallback = async () => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const callbackError = params.get("error");

    if (success === "google_calendar_connected") {
      setIsConnected(true);
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
      
      setSessionError(errorMessage);
      toast({
        title: "Erro de conexão",
        description: errorMessage,
        variant: "destructive",
      });
      window.history.replaceState({}, "", window.location.pathname);
    }
  };

  const handleConnect = async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      setSessionError(null);
      setIsValidatingSession(true);

      // CRITICAL: Validate session BEFORE starting OAuth flow
      console.log("[GoogleCalendar] Validating session before OAuth...");
      const sessionValid = await SessionManager.ensureValidSession();

      setIsValidatingSession(false);

      if (!sessionValid) {
        setSessionError("Your session has expired. Please log in again.");
        toast({
          title: "Session Expired",
          description: "Please log in again to connect Google Calendar.",
          variant: "destructive",
        });
        
        // Redirect to login after a short delay
        setTimeout(() => {
          SessionManager.handleSessionExpired(router);
        }, 2000);
        return;
      }

      console.log("[GoogleCalendar] Session valid, starting OAuth flow...");

      // Start OAuth flow
      const response = await fetch("/api/google-calendar/auth", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[GoogleCalendar] Auth error:", errorData);

        // Check if it's a session error
        if (response.status === 401 || SessionManager.isSessionError(errorData.error)) {
          setSessionError("Your session has expired. Please log in again.");
          toast({
            title: "Session Expired",
            description: "Please log in again to connect Google Calendar.",
            variant: "destructive",
          });
          
          setTimeout(() => {
            SessionManager.handleSessionExpired(router);
          }, 2000);
          return;
        }

        throw new Error(errorData.error || `HTTP ${response.status}: Failed to start authorization`);
      }

      const data = await response.json();

      if (!data.authUrl) {
        throw new Error("No authorization URL received from server");
      }

      console.log("[GoogleCalendar] Redirecting to Google OAuth...");
      window.location.href = data.authUrl;
    } catch (error) {
      console.error("[GoogleCalendar] Connection error:", error);
      
      setSessionError(null);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect Google Calendar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsValidatingSession(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setSessionError("Sessão expirada. Por favor faça login novamente.");
        setIsLoading(false);
        return;
      }

      const response = await fetch("/api/google-calendar/disconnect", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to disconnect");
      }

      setIsConnected(false);
      if (onDisconnect) onDisconnect();
      setSessionError(null);
      
      toast({
        title: "Google Calendar desconectado",
        description: "Sua conta foi desconectada com sucesso.",
      });
      
      setIsLoading(false);
    } catch (err) {
      console.error("Error disconnecting:", err);
      setSessionError("Erro ao desconectar. Tente novamente.");
      setIsLoading(false);
    }
  };

  if (isLoading && propConnected === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
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
          <CalendarIcon className="h-5 w-5" />
          Google Calendar
        </CardTitle>
        <CardDescription>
          {isConnected
            ? "Your Google Calendar is connected and syncing"
            : "Connect your Google Calendar to sync events and appointments"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sessionError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{sessionError}</AlertDescription>
          </Alert>
        )}

        {isCheckingStatus ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Checking connection status...</span>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium">Connected</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Not connected</span>
                </>
              )}
            </div>

            {isConnected ? (
              <Button
                onClick={handleDisconnect}
                variant="outline"
                size="sm"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  "Disconnect"
                )}
              </Button>
            ) : (
              <Button
                onClick={handleConnect}
                size="sm"
                disabled={isLoading || isValidatingSession}
              >
                {isValidatingSession ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validating session...
                  </>
                ) : isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    Connect Calendar
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}