import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Zap, Calendar, CheckSquare, Mail, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";

type WorkflowTemplate = {
  id: string;
  name: string;
  description: string | null;
  trigger_status: string;
  action_type: string;
  action_config: any;
  delay_days: number;
  delay_hours: number;
  is_global: boolean;
};

type UserWorkflowRule = {
  id: string;
  template_id: string;
  enabled: boolean;
};

export default function WorkflowsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [userWorkflows, setUserWorkflows] = useState<UserWorkflowRule[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [workflows, setWorkflows] = useState<any[]>([]); // Add missing state setter
  const [isNewWorkflowOpen, setIsNewWorkflowOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [formState, setFormState] = useState({
    name: "",
    description: "",
    trigger_status: "new",
    action_type: "send_email",
    template_id: "",
    delay_minutes: 0
  });

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("lead_workflow_rules") // Fixed table
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setWorkflows(data || []);
    } catch (error) {
      console.error("Error loading workflows:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar workflows.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isWorkflowEnabled = (templateId: string) => {
    return userWorkflows.some(w => w.template_id === templateId && w.enabled);
  };

  const handleToggle = async (template: WorkflowTemplate, enabled: boolean) => {
    try {
      if (enabled) {
        // Enable workflow by creating a rule based on the template
        const { error } = await supabase
          .from("lead_workflow_rules")
          .insert({
            user_id: userId,
            template_id: template.id,
            name: template.name,
            description: template.description,
            trigger_status: template.trigger_status,
            action_type: template.action_type as any, // Cast to any
            action_config: template.action_config,
            delay_days: template.delay_days,
            delay_hours: template.delay_hours,
            enabled: true,
          });

        if (error) throw error;

        toast({
          title: "✅ Workflow ativado",
          description: `${template.name} foi ativado na sua conta.`,
        });
      } else {
        // Disable workflow (delete the rule)
        const { error } = await supabase
          .from("lead_workflow_rules")
          .delete()
          .eq("user_id", userId)
          .eq("template_id", template.id);

        if (error) throw error;

        toast({
          title: "✅ Workflow desativado",
          description: `${template.name} foi removido da sua conta.`,
        });
      }

      loadWorkflows();
    } catch (error) {
      console.error("Error toggling workflow:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar estado do workflow.",
        variant: "destructive",
      });
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case "create_calendar_event": return <Calendar className="h-4 w-4 text-blue-600" />;
      case "create_task": return <CheckSquare className="h-4 w-4 text-green-600" />;
      case "send_email": return <Mail className="h-4 w-4 text-purple-600" />;
      default: return <Zap className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getActionLabel = (type: string) => {
    switch (type) {
      case "create_calendar_event": return "Criar Evento";
      case "create_task": return "Criar Tarefa";
      case "send_email": return "Enviar Email";
      default: return type;
    }
  };

  const getTriggerLabel = (status: string) => {
    const labels: Record<string, string> = {
      new: "Novo Lead",
      contacted: "Contactado",
      qualified: "Qualificado",
      proposal: "Em Proposta",
      negotiation: "Em Negociação",
      won: "Ganho",
      lost: "Perdido",
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: "bg-slate-100 text-slate-700",
      contacted: "bg-blue-100 text-blue-700",
      qualified: "bg-purple-100 text-purple-700",
      proposal: "bg-orange-100 text-orange-700",
      negotiation: "bg-amber-100 text-amber-700",
      won: "bg-green-100 text-green-700",
      lost: "bg-red-100 text-red-700",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Menu
            </Button>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Meus Workflows
              </h1>
              <p className="text-gray-600">
                Ative automações para melhorar a sua produtividade
              </p>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <Card className="mb-8 border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <Info className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg mb-1">Como funcionam as automações?</h3>
                <p className="text-gray-600 leading-relaxed">
                  Os workflows executam ações automáticas quando um lead muda de estado.
                  Ao ativar um workflow abaixo, ele passará a funcionar para <strong>todos os seus leads</strong>.
                  Por exemplo, pode criar automaticamente um evento na agenda 2 dias após contactar um cliente.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {templates.length === 0 ? (
            <Card className="col-span-full border-dashed">
              <CardContent className="py-12 text-center">
                <Zap className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">Nenhum workflow disponível</h3>
                <p className="text-gray-500 mt-1">O administrador ainda não criou templates de workflow.</p>
              </CardContent>
            </Card>
          ) : (
            templates.map((template) => {
              const isEnabled = isWorkflowEnabled(template.id);
              return (
                <Card 
                  key={template.id} 
                  className={`border-2 transition-all duration-200 ${
                    isEnabled ? "border-blue-500 bg-blue-50/10 shadow-md" : "border-transparent hover:border-gray-200 hover:shadow-sm"
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isEnabled ? "bg-blue-100" : "bg-gray-100"}`}>
                          {getActionIcon(template.action_type)}
                        </div>
                        <div>
                          <CardTitle className="text-lg font-semibold text-gray-900">
                            {template.name}
                          </CardTitle>
                          <Badge variant="outline" className={`mt-1 font-normal ${getStatusColor(template.trigger_status)}`}>
                            Quando: {getTriggerLabel(template.trigger_status)}
                          </Badge>
                        </div>
                      </div>
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) => handleToggle(template, checked)}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-4 min-h-[40px]">
                      {template.description || "Sem descrição disponível."}
                    </p>
                    
                    <div className="flex items-center gap-6 text-sm text-gray-500 pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        <span>Ação: <strong>{getActionLabel(template.action_type)}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Delay: <strong>
                          {template.delay_days > 0 ? `${template.delay_days} dias` : ""}
                          {template.delay_days > 0 && template.delay_hours > 0 ? " e " : ""}
                          {template.delay_hours > 0 ? `${template.delay_hours} horas` : ""}
                          {template.delay_days === 0 && template.delay_hours === 0 ? "Imediato" : ""}
                        </strong></span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}