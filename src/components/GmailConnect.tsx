import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface GmailConnectProps {
  isConnected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function GmailConnect({ isConnected, onConnect, onDisconnect }: GmailConnectProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleConnect = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Erro de autenticação",
          description: "Faça login para conectar o Gmail",
          variant: "destructive",
        });
        return;
      }

      // Call API to get auth URL
      const response = await fetch("/api/gmail/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to start OAuth flow");
      }

      // Redirect to Google OAuth
      window.location.href = data.url;
    } catch (error: any) {
      console.error("Gmail connect error:", error);
      toast({
        title: "Erro ao conectar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return;

      const { error } = await supabase
        .from("user_integrations")
        .delete()
        .eq("user_id", session.user.id)
        .eq("integration_type", "gmail");

      if (error) throw error;

      toast({
        title: "Gmail desconectado",
        description: "A sua conta Gmail foi desconectada com sucesso.",
      });

      onDisconnect();
    } catch (error: any) {
      toast({
        title: "Erro ao desconectar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (isConnected) {
    return (
      <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="p-2 bg-green-100 rounded-full">
          <Mail className="h-5 w-5 text-green-600" />
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-green-900">Gmail Conectado</h4>
          <p className="text-sm text-green-700">Sua conta está configurada para envio de emails.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDisconnect}
          disabled={loading}
          className="border-green-200 text-green-700 hover:bg-green-100 hover:text-green-800"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Desconectar"}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <div className="p-2 bg-gray-200 rounded-full">
        <Mail className="h-5 w-5 text-gray-500" />
      </div>
      <div className="flex-1">
        <h4 className="font-medium text-gray-900">Conectar Gmail</h4>
        <p className="text-sm text-gray-500">Conecte sua conta para enviar emails diretamente pelo Gmail.</p>
      </div>
      <Button
        onClick={handleConnect}
        disabled={loading}
        className="bg-red-600 hover:bg-red-700 text-white"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            A conectar...
          </>
        ) : (
          <>
            <Mail className="h-4 w-4 mr-2" />
            Conectar Gmail
          </>
        )}
      </Button>
    </div>
  );
}