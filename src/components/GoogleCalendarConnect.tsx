import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Calendar } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  storeGoogleCredentials,
  getGoogleCredentials,
  removeGoogleCredentials,
} from "@/services/googleCalendarService";

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
  const [error, setError] = useState<string | null>(null);

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
      const credentials = await getGoogleCredentials();
      setConnected(!!credentials);
    } catch (err) {
      console.error("Error checking connection:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCallback = async () => {
    const params = new URLSearchParams(window.location.search);
    const googleError = params.get("google_error");
    const accessToken = params.get("google_access_token");
    const refreshToken = params.get("google_refresh_token");
    const expiresAt = params.get("google_expires_at");

    if (googleError) {
      setError(googleError);
      // Clean URL without reloading
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    if (accessToken && refreshToken && expiresAt) {
      try {
        await storeGoogleCredentials(
          accessToken,
          refreshToken,
          expiresAt // Pass as string, removing parseInt
        );
        setConnected(true);
        if (onConnect) onConnect();
        setError(null);
        // Clean URL without reloading
        window.history.replaceState({}, "", window.location.pathname);
      } catch (err) {
        console.error("Error storing credentials:", err);
        setError("Erro ao guardar credenciais. Tente novamente.");
      }
    }
  };

  const handleConnect = () => {
    setError(null);
    
    // Validate environment variables
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    
    console.log("🔍 [GoogleCalendarConnect] Client ID from env:", clientId);
    console.log("🔍 [GoogleCalendarConnect] Full env check:", {
      hasClientId: !!clientId,
      clientIdLength: clientId?.length,
      clientIdFirst50: clientId?.substring(0, 50)
    });
    
    if (!clientId) {
      setError("Configuração OAuth incompleta. Variável NEXT_PUBLIC_GOOGLE_CLIENT_ID não está definida.");
      return;
    }
    
    window.location.href = "/api/google-calendar/auth";
  };

  const handleDisconnect = async () => {
    try {
      await removeGoogleCredentials();
      setConnected(false);
      if (onDisconnect) onDisconnect();
      setError(null);
    } catch (err) {
      console.error("Error disconnecting:", err);
      setError("Erro ao desconectar. Tente novamente.");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Google Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">A carregar...</p>
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
            <Button variant="destructive" onClick={handleDisconnect}>
              Desconectar Google Calendar
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
                Se receber erro 403, verifique se as credenciais OAuth estão configuradas corretamente no arquivo .env.local e no Google Cloud Console.
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
            <Button onClick={handleConnect} className="w-full">
              Conectar Google Calendar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}