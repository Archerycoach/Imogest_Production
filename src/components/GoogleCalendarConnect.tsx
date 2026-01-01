import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Loader2 } from "lucide-react";

interface GoogleCalendarConnectProps {
  isConnected?: boolean;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  onDisconnect?: () => void;
}

export function GoogleCalendarConnect({ 
  isConnected = false,
  onSuccess,
  onError,
  onDisconnect
}: GoogleCalendarConnectProps) {
  const [loading, setLoading] = useState(false);

  const handleConnect = () => {
    setLoading(true);
    
    // Validate environment variables
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    
    if (!clientId) {
      if (onError) {
        onError("Configuração OAuth incompleta. Variável NEXT_PUBLIC_GOOGLE_CLIENT_ID não está definida.");
      }
      setLoading(false);
      return;
    }
    
    // Redirect to auth endpoint
    window.location.href = "/api/google-calendar/auth";
  };

  const handleDisconnect = async () => {
    if (onDisconnect) {
      setLoading(true);
      try {
        await onDisconnect();
      } finally {
        setLoading(false);
      }
    }
  };

  if (isConnected) {
    return (
      <Button
        onClick={handleDisconnect}
        disabled={loading}
        variant="destructive"
        className="flex-1"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            A desconectar...
          </>
        ) : (
          "Desconectar"
        )}
      </Button>
    );
  }

  return (
    <Button
      onClick={handleConnect}
      disabled={loading}
      className="flex-1"
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          A conectar...
        </>
      ) : (
        <>
          <Calendar className="mr-2 h-4 w-4" />
          Conectar Google Calendar
        </>
      )}
    </Button>
  );
}