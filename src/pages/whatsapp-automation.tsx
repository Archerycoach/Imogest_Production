import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Clock, Users, Gift, Settings } from "lucide-react";
// Services imports fixed
import { getTemplates } from "@/services/templateService";
import Link from "next/link";

export default function WhatsAppAutomationPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false); // Changed logic to simple state for now
  
  // Simplified view as automation logic moved to Workflows
  return (
    <Layout>
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="h-8 w-8 text-green-600" />
            Automação WhatsApp
          </h1>
          <p className="text-slate-500 mt-2">
            A gestão de automações foi movida para a secção de <strong>Workflows</strong> para centralizar todas as regras de negócio.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Migração de Funcionalidade</CardTitle>
            <CardDescription>
              Agora podes configurar respostas automáticas de WhatsApp diretamente no editor de Workflows.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-6">
              Configure mensagens automáticas baseadas em eventos do sistema.
            </p>
            <Link href="/admin/workflows">
              <Button className="w-full">
                Configurar Workflows
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}