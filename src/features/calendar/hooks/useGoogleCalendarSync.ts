import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

export function useGoogleCalendarSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();

  const checkConnection = useCallback(async () => {
    try {
      const response = await fetch("/api/google-calendar/auth");
      const data = await response.json();
      setIsConnected(data.connected || false);
    } catch (error) {
      console.error("Error checking Google Calendar connection:", error);
      setIsConnected(false);
    }
  }, []);

  const syncWithGoogle = useCallback(async () => {
    try {
      setIsSyncing(true);
      const response = await fetch("/api/google-calendar/sync", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Sync failed");
      }

      toast({
        title: "Sincronização concluída",
        description: "Eventos sincronizados com Google Calendar",
      });
    } catch (error) {
      console.error("Error syncing with Google Calendar:", error);
      toast({
        title: "Erro na sincronização",
        description: "Não foi possível sincronizar com Google Calendar",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  }, [toast]);

  const connectGoogle = useCallback(() => {
    window.location.href = "/api/google-calendar/auth";
  }, []);

  return {
    isConnected,
    isSyncing,
    checkConnection,
    syncWithGoogle,
    connectGoogle,
  };
}