import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  getModulesConfig,
  updateModulesConfig,
  getPipelineConfig,
  updatePipelineConfig,
  getRequiredFieldsConfig,
  updateRequiredFieldsConfig,
  getGoogleCalendarConfig,
  updateGoogleCalendarConfig,
} from "@/services/settingsService";
import { getSession } from "@/services/authService";
import { getUserProfile } from "@/services/profileService";
import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function SystemSettings() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modules configuration
  const [modules, setModules] = useState({
    leads: true,
    properties: true,
    tasks: true,
    calendar: true,
    reports: true,
    chat: true,
  });

  // Pipeline configuration
  const [pipeline, setPipeline] = useState({
    buyer: [] as string[],
    seller: [] as string[],
  });

  // Required fields configuration
  const [requiredFields, setRequiredFields] = useState({
    leads: [] as string[],
    properties: [] as string[],
    tasks: [] as string[],
  });

  // Google Calendar configuration
  const [googleCalendar, setGoogleCalendar] = useState({
    client_id: "",
    client_secret: "",
    redirect_uri: "",
  });

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const session = await getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      const profile = await getUserProfile();
      if (profile?.role !== "admin") {
        toast({
          title: "Acesso negado",
          description: "Apenas administradores podem aceder a esta página.",
          variant: "destructive",
        });
        router.push("/dashboard");
        return;
      }

      await loadSettings();
    } catch (error) {
      console.error("Error checking access:", error);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const [modulesData, pipelineData, fieldsData, googleData] = await Promise.all([
        getModulesConfig(),
        getPipelineConfig(),
        getRequiredFieldsConfig(),
        getGoogleCalendarConfig(),
      ]);

      setModules(modulesData as any);
      setPipeline(pipelineData as any);
      setRequiredFields(fieldsData as any);
      setGoogleCalendar(googleData as any);
    } catch (error) {
      console.error("Error loading settings:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar configurações",
        variant: "destructive",
      });
    }
  };

  const handleSaveModules = async () => {
    setSaving(true);
    try {
      await updateModulesConfig(modules);
      toast({
        title: "Sucesso",
        description: "Configuração de módulos atualizada com sucesso",
      });
    } catch (error) {
      console.error("Error saving modules:", error);
      toast({
        title: "Erro",
        description: "Erro ao guardar configuração de módulos",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePipeline = async () => {
    setSaving(true);
    try {
      await updatePipelineConfig(pipeline);
      toast({
        title: "Sucesso",
        description: "Configuração do pipeline atualizada com sucesso",
      });
    } catch (error) {
      console.error("Error saving pipeline:", error);
      toast({
        title: "Erro",
        description: "Erro ao guardar configuração do pipeline",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRequiredFields = async () => {
    setSaving(true);
    try {
      await updateRequiredFieldsConfig(requiredFields);
      toast({
        title: "Sucesso",
        description: "Campos obrigatórios atualizados com sucesso",
      });
    } catch (error) {
      console.error("Error saving required fields:", error);
      toast({
        title: "Erro",
        description: "Erro ao guardar campos obrigatórios",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGoogleCalendar = async () => {
    setSaving(true);
    try {
      // Validate fields
      if (!googleCalendar.client_id || !googleCalendar.client_secret || !googleCalendar.redirect_uri) {
        toast({
          title: "Erro de Validação",
          description: "Todos os campos são obrigatórios",
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      // Validate Client ID format
      if (!googleCalendar.client_id.includes(".apps.googleusercontent.com")) {
        toast({
          title: "Erro de Validação",
          description: "Client ID deve terminar com .apps.googleusercontent.com",
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      // Validate Client Secret format
      if (!googleCalendar.client_secret.startsWith("GOCSPX-")) {
        toast({
          title: "Erro de Validação",
          description: "Client Secret deve começar com GOCSPX-",
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      await updateGoogleCalendarConfig(googleCalendar);
      toast({
        title: "Sucesso",
        description: "Configuração Google Calendar atualizada com sucesso. Reinicie o servidor para aplicar as alterações.",
      });
    } catch (error) {
      console.error("Error saving Google Calendar config:", error);
      toast({
        title: "Erro",
        description: "Erro ao guardar configuração Google Calendar",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRestartServer = async () => {
    setSaving(true);
    try {
      const session = await getSession();
      if (!session) {
        toast({
          title: "Erro",
          description: "Sessão expirada. Faça login novamente.",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch("/api/admin/restart-server", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao reiniciar servidor");
      }

      toast({
        title: "✅ Sucesso",
        description: "Servidor reiniciado com sucesso! As novas configurações estão ativas.",
      });
    } catch (error) {
      console.error("Error restarting server:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao reiniciar servidor",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["admin"]}>
        <Layout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push("/admin/dashboard")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Dashboard
            </Button>
            <div>
              <h1 className="text-4xl font-bold text-slate-900">
                ⚙️ Configurações do Sistema
              </h1>
              <p className="text-slate-600 mt-2">
                Gerir módulos, pipeline e configurações globais
              </p>
            </div>
          </div>

          <div className="grid gap-6">
            {/* Modules Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📦 Módulos Ativos
                </CardTitle>
                <CardDescription>
                  Ativar ou desativar funcionalidades da aplicação
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="module-leads">Leads</Label>
                      <p className="text-sm text-slate-500">
                        Gestão de leads e contactos
                      </p>
                    </div>
                    <Switch
                      id="module-leads"
                      checked={modules.leads}
                      onCheckedChange={(checked) =>
                        setModules({ ...modules, leads: checked })
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="module-properties">Imóveis</Label>
                      <p className="text-sm text-slate-500">
                        Base de dados de propriedades
                      </p>
                    </div>
                    <Switch
                      id="module-properties"
                      checked={modules.properties}
                      onCheckedChange={(checked) =>
                        setModules({ ...modules, properties: checked })
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="module-tasks">Tarefas</Label>
                      <p className="text-sm text-slate-500">
                        Sistema de gestão de tarefas
                      </p>
                    </div>
                    <Switch
                      id="module-tasks"
                      checked={modules.tasks}
                      onCheckedChange={(checked) =>
                        setModules({ ...modules, tasks: checked })
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="module-calendar">Calendário</Label>
                      <p className="text-sm text-slate-500">
                        Agenda e sincronização Google Calendar
                      </p>
                    </div>
                    <Switch
                      id="module-calendar"
                      checked={modules.calendar}
                      onCheckedChange={(checked) =>
                        setModules({ ...modules, calendar: checked })
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="module-reports">Relatórios</Label>
                      <p className="text-sm text-slate-500">
                        Relatórios e análises exportáveis
                      </p>
                    </div>
                    <Switch
                      id="module-reports"
                      checked={modules.reports}
                      onCheckedChange={(checked) =>
                        setModules({ ...modules, reports: checked })
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="module-chat">Chat</Label>
                      <p className="text-sm text-slate-500">
                        Sistema de mensagens internas
                      </p>
                    </div>
                    <Switch
                      id="module-chat"
                      checked={modules.chat}
                      onCheckedChange={(checked) =>
                        setModules({ ...modules, chat: checked })
                      }
                    />
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button onClick={handleSaveModules} disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          A guardar...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Guardar Módulos
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pipeline Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🎯 Configuração do Pipeline
                </CardTitle>
                <CardDescription>
                  Personalizar etapas do funil de vendas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <Label className="text-base font-semibold">
                      Pipeline Compradores
                    </Label>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {pipeline.buyer.map((stage, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-sm px-3 py-1"
                        >
                          {index + 1}. {stage}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-base font-semibold">
                      Pipeline Vendedores
                    </Label>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {pipeline.seller.map((stage, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-sm px-3 py-1"
                        >
                          {index + 1}. {stage}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-900">
                      ℹ️ <strong>Nota:</strong> A personalização avançada de
                      etapas do pipeline estará disponível em breve. Por agora, as
                      etapas padrão estão otimizadas para o mercado imobiliário.
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSavePipeline} disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          A guardar...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Guardar Pipeline
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Required Fields Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  ✅ Campos Obrigatórios
                </CardTitle>
                <CardDescription>
                  Definir quais campos são obrigatórios em cada módulo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <Label className="text-base font-semibold">Leads</Label>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {requiredFields.leads.map((field, index) => (
                        <Badge key={index} className="text-sm px-3 py-1">
                          {field}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-base font-semibold">Imóveis</Label>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {requiredFields.properties.map((field, index) => (
                        <Badge key={index} className="text-sm px-3 py-1">
                          {field}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-base font-semibold">Tarefas</Label>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {requiredFields.tasks.map((field, index) => (
                        <Badge key={index} className="text-sm px-3 py-1">
                          {field}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-900">
                      ℹ️ <strong>Nota:</strong> A personalização de campos
                      obrigatórios estará disponível em breve. Os campos atuais
                      são otimizados para melhor qualidade de dados.
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={handleSaveRequiredFields}
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          A guardar...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Guardar Campos
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Google Calendar Integration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📅 Integração Google Calendar
                </CardTitle>
                <CardDescription>
                  Configurar credenciais OAuth para sincronização com Google Calendar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-900">
                      <strong>📚 Como obter as credenciais:</strong>
                    </p>
                    <ol className="text-sm text-blue-900 mt-2 space-y-1 ml-4 list-decimal">
                      <li>Aceda a <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Google Cloud Console</a></li>
                      <li>Crie um projeto ou selecione um existente</li>
                      <li>Ative a <strong>Google Calendar API</strong></li>
                      <li>Configure a tela de consentimento OAuth</li>
                      <li>Crie credenciais OAuth 2.0 (Aplicativo da Web)</li>
                      <li>Adicione a URI de redirecionamento abaixo</li>
                      <li>Copie o Client ID e Client Secret aqui</li>
                    </ol>
                    <p className="text-sm text-blue-900 mt-3">
                      📖 <strong>Guia completo:</strong> GOOGLE_CALENDAR_QUICK_SETUP.md
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="google-client-id" className="text-base font-semibold">
                        Client ID *
                      </Label>
                      <p className="text-sm text-slate-500 mb-2">
                        ID do cliente OAuth 2.0 (termina com .apps.googleusercontent.com)
                      </p>
                      <Input
                        id="google-client-id"
                        type="text"
                        placeholder="123456789012-abc123def456.apps.googleusercontent.com"
                        value={googleCalendar.client_id}
                        onChange={(e) =>
                          setGoogleCalendar({ ...googleCalendar, client_id: e.target.value })
                        }
                        className="font-mono text-sm"
                      />
                    </div>

                    <Separator />

                    <div>
                      <Label htmlFor="google-client-secret" className="text-base font-semibold">
                        Client Secret *
                      </Label>
                      <p className="text-sm text-slate-500 mb-2">
                        Segredo do cliente OAuth 2.0 (começa com GOCSPX-)
                      </p>
                      <Input
                        id="google-client-secret"
                        type="password"
                        placeholder="GOCSPX-abcdefghijklmnopqrstuvwxyz"
                        value={googleCalendar.client_secret}
                        onChange={(e) =>
                          setGoogleCalendar({ ...googleCalendar, client_secret: e.target.value })
                        }
                        className="font-mono text-sm"
                      />
                    </div>

                    <Separator />

                    <div>
                      <Label htmlFor="google-redirect-uri" className="text-base font-semibold">
                        Redirect URI *
                      </Label>
                      <p className="text-sm text-slate-500 mb-2">
                        URI de redirecionamento após autorização OAuth
                      </p>
                      <Input
                        id="google-redirect-uri"
                        type="text"
                        placeholder="https://seu-dominio.com/api/google-calendar/callback"
                        value={googleCalendar.redirect_uri}
                        onChange={(e) =>
                          setGoogleCalendar({ ...googleCalendar, redirect_uri: e.target.value })
                        }
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        💡 Para desenvolvimento: http://localhost:3000/api/google-calendar/callback
                      </p>
                    </div>

                    <Separator />

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm text-yellow-900">
                        ⚠️ <strong>Importante:</strong> Após guardar as configurações, é necessário reiniciar o servidor para aplicar as alterações.
                      </p>
                      <p className="text-sm text-yellow-900 mt-2">
                        Execute: <code className="bg-yellow-100 px-2 py-1 rounded">pm2 restart all</code>
                      </p>
                    </div>

                    <div className="flex justify-between items-center pt-4">
                      <div className="text-sm text-slate-600">
                        {googleCalendar.client_id && googleCalendar.client_secret && googleCalendar.redirect_uri ? (
                          <Badge className="bg-green-100 text-green-800">
                            ✅ Configuração Completa
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-600">
                            ⚠️ Configuração Incompleta
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleSaveGoogleCalendar} disabled={saving}>
                          {saving ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              A guardar...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Guardar Configuração
                            </>
                          )}
                        </Button>
                        <Button 
                          onClick={handleRestartServer} 
                          disabled={saving}
                          variant="outline"
                          className="border-blue-300 text-blue-600 hover:bg-blue-50"
                        >
                          {saving ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              A reiniciar...
                            </>
                          ) : (
                            <>
                              🔄 Reiniciar Servidor
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}