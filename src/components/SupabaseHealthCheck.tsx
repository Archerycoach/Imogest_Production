import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle } from "lucide-react";

export function SupabaseHealthCheck() {
  const [status, setStatus] = useState<"checking" | "healthy" | "error">("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    checkSupabaseConnection();
  }, []);

  const checkSupabaseConnection = async () => {
    try {
      // Test 1: Check if Supabase URL is valid
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl || supabaseUrl.includes("invalid")) {
        setStatus("error");
        setMessage("Supabase URL inválido ou não configurado");
        return;
      }

      // Test 2: Try to get session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        setStatus("error");
        setMessage(`Erro ao obter sessão: ${sessionError.message}`);
        return;
      }

      // Test 3: Try to get user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        setStatus("error");
        setMessage(`Erro ao obter utilizador: ${userError.message}`);
        return;
      }

      if (!session || !user) {
        setStatus("error");
        setMessage("Sessão expirada. Por favor, faça login novamente.");
        return;
      }

      setStatus("healthy");
      setMessage(`Conectado como: ${user.email}`);
    } catch (error: any) {
      setStatus("error");
      setMessage(`Erro de conectividade: ${error.message}`);
    }
  };

  if (status === "checking") {
    return null; // Don't show anything while checking
  }

  if (status === "healthy") {
    return null; // Don't show if everything is OK
  }

  return (
    <Alert variant="destructive" className="m-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Erro de Conectividade Supabase</AlertTitle>
      <AlertDescription>
        {message}
        <br />
        <button
          onClick={() => {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = "/login";
          }}
          className="mt-2 text-sm underline"
        >
          Limpar cache e fazer login novamente
        </button>
      </AlertDescription>
    </Alert>
  );
}