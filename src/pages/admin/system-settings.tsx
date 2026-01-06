import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { ArrowLeft, Save, Loader2, MessageSquare, Send, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { supabase } from "@/integrations/supabase/client";
import { getIntegration, updateIntegrationSettings } from "@/services/integrationsService";

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
    clientId: "",
    clientSecret: "",
    redirectUri: "",
  });

  // WhatsApp configuration
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [whatsappPhoneNumberId, setWhatsappPhoneNumberId] = useState("");
  const [whatsappAccessToken, setWhatsappAccessToken] = useState("");
  const [whatsappTime, setWhatsappTime] = useState("08:00");
  const [testingWhatsapp, setTestingWhatsapp] = useState(false);
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);

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
      const [modulesData, pipelineData, fieldsData, googleData, whatsappData] = await Promise.all([
        getModulesConfig(),
        getPipelineConfig(),
        getRequiredFieldsConfig(),
        getGoogleCalendarConfig(),
        getIntegration("whatsapp"),
      ]);

      setModules(modulesData as any);
      setPipeline(pipelineData as any);
      setRequiredFields(fieldsData as any);
      setGoogleCalendar(googleData as any);

      // Load WhatsApp configuration
      if (whatsappData) {
        setWhatsappEnabled(whatsappData.is_active);
        setWhatsappPhoneNumberId(whatsappData.settings.phoneNumberId || "");
        setWhatsappAccessToken(whatsappData.settings.accessToken || "");
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar configurações",
        variant: "destructive",
      });
    }
  };

  const handleSaveWhatsApp = async () => {
    setSavingWhatsapp(true);
    try {
      // Validate fields
      if (whatsappEnabled && (!whatsappPhoneNumberId || !whatsappAccessToken)) {
        toast({
          title: "Erro de Validação",
          description: "Phone Number ID e Access Token são obrigatórios quando a integração está ativa.",
          variant: "destructive",
        });
        setSavingWhatsapp(false);
        return;
      }

      await updateIntegrationSettings("whatsapp", {
        phoneNumberId: whatsappPhoneNumberId,
        accessToken: whatsappAccessToken,
      });

      // Toggle active status separately
      await supabase
        .from("integration_settings")
        .update({ 
          is_active: whatsappEnabled,
          updated_at: new Date().toISOString(),
        })
        .eq("integration_name", "whatsapp");

      toast({
        title: "✅ Sucesso",
        description: "Configurações do WhatsApp guardadas com sucesso!",
      });
    } catch (error) {
      console.error("Error saving WhatsApp config:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao guardar configurações do WhatsApp",
        variant: "destructive",
      });
    } finally {
      setSavingWhatsapp(false);
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
      if (!googleCalendar.clientId || !googleCalendar.clientSecret || !googleCalendar.redirectUri) {
        toast({
          title: "Erro de Validação",
          description: "Todos os campos são obrigatórios",
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      // Validate Client ID format
      if (!googleCalendar.clientId.includes(".apps.googleusercontent.com")) {
        toast({
          title: "Erro de Validação",
          description: "Client ID deve terminar com .apps.googleusercontent.com",
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      // Validate Client Secret format
      if (!googleCalendar.clientSecret.startsWith("GOCSPX-")) {
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

  // Test WhatsApp daily notification
  const handleTestWhatsAppNotification = async () => {
    setTestingWhatsapp(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const response = await supabase.functions.invoke("daily-tasks-whatsapp");
      
      if (response.error) throw response.error;

      toast({
        title: "Teste Enviado!",
        description: "Verifique o console ou o WhatsApp para ver os resultados.",
      });
    } catch (error: any) {
      console.error("Error testing WhatsApp notification:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao testar notificação WhatsApp",
        variant: "destructive",
      });
    } finally {
      setTestingWhatsapp(false);
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
                        value={googleCalendar.clientId}
                        onChange={(e) =>
                          setGoogleCalendar({ ...googleCalendar, clientId: e.target.value })
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
                        value={googleCalendar.clientSecret}
                        onChange={(e) =>
                          setGoogleCalendar({ ...googleCalendar, clientSecret: e.target.value })
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
                        value={googleCalendar.redirectUri}
                        onChange={(e) =>
                          setGoogleCalendar({ ...googleCalendar, redirectUri: e.target.value })
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
                        {googleCalendar.clientId && googleCalendar.clientSecret && googleCalendar.redirectUri ? (
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

            {/* WhatsApp Daily Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Notificações WhatsApp Diárias
                </CardTitle>
                <CardDescription>
                  Configure o envio automático de tarefas diárias via WhatsApp
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Ativar Notificações Automáticas</Label>
                    <p className="text-sm text-muted-foreground">
                      Enviar lista de tarefas diárias via WhatsApp
                    </p>
                  </div>
                  <Switch
                    checked={whatsappEnabled}
                    onCheckedChange={setWhatsappEnabled}
                  />
                </div>

                {whatsappEnabled && (
                  <>
                    <Separator />

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="whatsapp-phone-id" className="text-base font-semibold">
                          Phone Number ID *
                        </Label>
                        <p className="text-sm text-slate-500 mb-2">
                          ID do número de telefone do WhatsApp Business API
                        </p>
                        <Input
                          id="whatsapp-phone-id"
                          type="text"
                          placeholder="123456789012345"
                          value={whatsappPhoneNumberId}
                          onChange={(e) => setWhatsappPhoneNumberId(e.target.value)}
                          className="font-mono text-sm"
                        />
                      </div>

                      <Separator />

                      <div>
                        <Label htmlFor="whatsapp-token" className="text-base font-semibold">
                          Access Token *
                        </Label>
                        <p className="text-sm text-slate-500 mb-2">
                          Token de acesso permanente do WhatsApp Business API
                        </p>
                        <Input
                          id="whatsapp-token"
                          type="password"
                          placeholder="EAAxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          value={whatsappAccessToken}
                          onChange={(e) => setWhatsappAccessToken(e.target.value)}
                          className="font-mono text-sm"
                        />
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <Label htmlFor="whatsapp-time">Horário de Envio</Label>
                        <Input
                          id="whatsapp-time"
                          type="time"
                          value={whatsappTime}
                          onChange={(e) => setWhatsappTime(e.target.value)}
                        />
                        <p className="text-sm text-muted-foreground">
                          Horário em que as notificações serão enviadas (horário de Lisboa)
                        </p>
                      </div>

                      <Separator />

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-900">
                          <strong>📚 Como obter as credenciais:</strong>
                        </p>
                        <ol className="text-sm text-blue-900 mt-2 space-y-1 ml-4 list-decimal">
                          <li>Aceda a <a href="https://business.facebook.com/settings/whatsapp-business-accounts" target="_blank" rel="noopener noreferrer" className="underline font-semibold">WhatsApp Business</a></li>
                          <li>Configure uma conta WhatsApp Business API</li>
                          <li>Copie o <strong>Phone Number ID</strong></li>
                          <li>Gere um <strong>Access Token</strong> permanente</li>
                          <li>Configure os números de telefone dos utilizadores nos perfis</li>
                        </ol>
                      </div>

                      <div className="bg-muted p-4 rounded-lg space-y-2">
                        <h4 className="font-semibold text-sm">Como Funciona:</h4>
                        <ul className="text-sm space-y-1 text-muted-foreground">
                          <li>• Todos os agentes, team leads e admins recebem a lista</li>
                          <li>• Apenas utilizadores com número de telefone configurado</li>
                          <li>• Tarefas agrupadas por prioridade (Alta, Média, Baixa)</li>
                          <li>• Inclui horário e cliente/lead associado</li>
                          <li>• Apenas tarefas pendentes do dia</li>
                        </ul>
                      </div>

                      <div className="flex gap-2 pt-4">
                        <Button
                          onClick={handleSaveWhatsApp}
                          disabled={savingWhatsapp}
                          className="flex-1"
                        >
                          {savingWhatsapp ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              A guardar...
                            </>
                          ) : (
                            <>
                              <Save className="mr-2 h-4 w-4" />
                              Guardar Configurações
                            </>
                          )}
                        </Button>

                        <Button
                          onClick={handleTestWhatsAppNotification}
                          disabled={testingWhatsapp || !whatsappPhoneNumberId || !whatsappAccessToken}
                          variant="outline"
                          className="flex-1"
                        >
                          {testingWhatsapp ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Enviando Teste...
                            </>
                          ) : (
                            <>
                              <Send className="mr-2 h-4 w-4" />
                              Testar Notificação Agora
                            </>
                          )}
                        </Button>
                      </div>

                      {whatsappPhoneNumberId && whatsappAccessToken ? (
                        <Badge className="bg-green-100 text-green-800 w-full justify-center">
                          ✅ Credenciais Configuradas
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-600 w-full justify-center">
                          ⚠️ Preencha as credenciais acima
                        </Badge>
                      )}
                    </div>

                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Configuração Necessária</AlertTitle>
                      <AlertDescription>
                        Para ativar o envio automático via WhatsApp Business API:
                        <br />• Configure Phone Number ID e Access Token acima
                        <br />• Adicione número de telefone no perfil de cada utilizador (formato: +351912345678)
                        <br />• As credenciais são sincronizadas automaticamente com o Supabase Edge Functions
                      </AlertDescription>
                    </Alert>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}