// Last updated: 2026-01-04T22:47:00Z - Gmail SMTP fields fix
import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { GoogleCalendarConnect } from "@/components/GoogleCalendarConnect";
import {
  MessageCircle,
  Calendar,
  CreditCard,
  Landmark,
  MapPin,
  Mail,
  Phone,
  Bell,
  Check,
  X,
  AlertCircle,
  Loader2,
  ExternalLink,
  Eye,
  EyeOff,
  Save,
  TestTube,
  Play,
} from "lucide-react";
import {
  getAllIntegrations,
  updateIntegrationSettings,
  testIntegration,
  syncToSupabaseSecrets,
  INTEGRATIONS,
  IntegrationSettings,
  IntegrationConfig,
} from "@/services/integrationsService";

const ICONS: Record<string, any> = {
  MessageCircle,
  Calendar,
  CreditCard,
  Landmark,
  MapPin,
  Mail,
  Phone,
  Bell,
};

export default function Integrations() {
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState<IntegrationSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState<Record<string, Record<string, string>>>({});
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const initializeSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Session error:", error);
          setLoading(false);
          return;
        }

        if (!session) {
          console.warn("No active session");
          setLoading(false);
          return;
        }

        setSessionReady(true);
      } catch (error) {
        console.error("Error initializing session:", error);
        setLoading(false);
      }
    };

    initializeSession();
  }, []);

  useEffect(() => {
    if (sessionReady) {
      loadIntegrations();
      checkGoogleCalendarConnection();
    }
  }, [sessionReady]);

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      const data = await getAllIntegrations();
      
      const existingNames = data.map(i => i.integration_name);
      const missingIntegrations = Object.keys(INTEGRATIONS).filter(
        name => !existingNames.includes(name)
      );

      // Clean up Gmail integration if it has old OAuth fields instead of SMTP fields
      const gmailIntegration = data.find(i => i.integration_name === 'gmail');
      if (gmailIntegration && gmailIntegration.settings) {
        const hasOldFields = 'clientId' in gmailIntegration.settings || 
                            'clientSecret' in gmailIntegration.settings ||
                            'redirectUri' in gmailIntegration.settings;
        const hasNewFields = 'smtp_user' in gmailIntegration.settings;
        
        if (hasOldFields && !hasNewFields) {
          console.log('Gmail has old OAuth fields, cleaning...');
          await updateIntegrationSettings('gmail', {});
          gmailIntegration.settings = {};
        }
      }

      if (missingIntegrations.length > 0) {
        for (const name of missingIntegrations) {
          await updateIntegrationSettings(name, {});
        }
        const updatedData = await getAllIntegrations();
        setIntegrations(updatedData);

        const initialFormData: Record<string, Record<string, string>> = {};
        updatedData.forEach((integration) => {
          initialFormData[integration.integration_name] = integration.settings;
        });
        setFormData(initialFormData);
      } else {
        setIntegrations(data);

        const initialFormData: Record<string, Record<string, string>> = {};
        data.forEach((integration) => {
          initialFormData[integration.integration_name] = integration.settings;
        });
        setFormData(initialFormData);
      }
    } catch (error: any) {
      console.error("Error loading integrations:", error);
      toast({
        title: "Erro ao carregar integrações",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkGoogleCalendarConnection = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        console.warn("No session for Google Calendar check");
        setGoogleCalendarConnected(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_integrations")
        .select("is_active")
        .eq("user_id", session.user.id)
        .eq("integration_type", "google_calendar")
        .maybeSingle();

      if (error) {
        console.error("Error checking Google Calendar:", error);
        setGoogleCalendarConnected(false);
        return;
      }

      setGoogleCalendarConnected(data?.is_active || false);
    } catch (error) {
      console.error("Error in checkGoogleCalendarConnection:", error);
      setGoogleCalendarConnected(false);
    }
  };

  const handleSave = async (integrationName: string) => {
    try {
      setSaving(integrationName);
      const integration = integrations.find((i) => i.integration_name === integrationName);
      if (!integration) return;

      const config = INTEGRATIONS[integrationName];
      const missingFields = config.fields
        .filter(field => field.required && !formData[integrationName]?.[field.key])
        .map(field => field.label);

      if (missingFields.length > 0) {
        toast({
          title: "Campos obrigatórios em falta",
          description: `Por favor preencha: ${missingFields.join(", ")}`,
          variant: "destructive",
        });
        return;
      }

      // Auto-add redirectUri for Google Calendar if not present
      const settingsToSave = { ...formData[integrationName] };
      if (integrationName === "google_calendar" && !settingsToSave.redirectUri) {
        settingsToSave.redirectUri = `${typeof window !== 'undefined' ? window.location.origin : 'https://www.imogest.pt'}/api/google-calendar/callback`;
      }

      await updateIntegrationSettings(
        integrationName,
        settingsToSave
      );

      await syncToSupabaseSecrets(integrationName);

      toast({
        title: "✅ Configuração guardada!",
        description: "As credenciais foram atualizadas com sucesso. Pode agora testar a conexão.",
      });

      await loadIntegrations();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  const handleTest = async (integrationName: string) => {
    try {
      const integration = integrations.find((i) => i.integration_name === integrationName);
      if (!integration || Object.keys(integration.settings || {}).length === 0) {
        toast({
          title: "⚠️ Credenciais não guardadas",
          description: "Por favor guarde a configuração antes de testar a conexão.",
          variant: "destructive",
        });
        return;
      }

      const hasChanges = JSON.stringify(formData[integrationName]) !== JSON.stringify(integration.settings);
      if (hasChanges) {
        toast({
          title: "⚠️ Alterações não guardadas",
          description: "Guarde as alterações antes de testar a conexão.",
          variant: "destructive",
        });
        return;
      }

      setTesting(integrationName);
      const result = await testIntegration(integrationName);

      toast({
        title: result.success ? "✅ Teste bem-sucedido!" : "❌ Teste falhou",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });

      await loadIntegrations();
    } catch (error: any) {
      toast({
        title: "Erro ao testar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTesting(null);
    }
  };

  const handleToggle = async (integrationName: string, isActive: boolean) => {
    try {
      const integration = integrations.find((i) => i.integration_name === integrationName);
      if (!integration) return;

      await updateIntegrationSettings(integrationName, integration.settings);
      
      await supabase
        .from("integration_settings")
        .update({ 
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq("integration_name", integrationName);

      toast({
        title: isActive ? "Integração ativada" : "Integração desativada",
        description: `${INTEGRATIONS[integrationName]?.displayName} foi ${isActive ? "ativada" : "desativada"}.`,
      });

      await loadIntegrations();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (integrationName: string, fieldKey: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [integrationName]: {
        ...prev[integrationName],
        [fieldKey]: value,
      },
    }));
  };

  const togglePasswordVisibility = (fieldId: string) => {
    setShowPasswords((prev) => ({
      ...prev,
      [fieldId]: !prev[fieldId],
    }));
  };

  const renderIntegrationCard = (config: IntegrationConfig, data: IntegrationSettings) => {
    const Icon = ICONS[config.icon];
    const isSaving = saving === config.name;
    const isTesting = testing === config.name;
    const hasChanges = JSON.stringify(formData[config.name]) !== JSON.stringify(data.settings);
    const hasCredentials = Object.keys(data.settings || {}).length > 0;
    const canTest = hasCredentials && !hasChanges && config.testEndpoint;

    return (
      <Card key={`${config.name}-v2`}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${config.color} text-white`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  {config.displayName}
                  {data.is_active && (
                    <Badge variant="default" className="bg-green-500">
                      <Check className="h-3 w-3 mr-1" />
                      Ativa
                    </Badge>
                  )}
                  {data.test_status === "success" && (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      Testada ✓
                    </Badge>
                  )}
                  {data.test_status === "failed" && (
                    <Badge variant="outline" className="text-red-600 border-red-600">
                      Teste Falhou
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="mt-1">{config.description}</CardDescription>
              </div>
            </div>
            <Switch
              checked={data.is_active}
              onCheckedChange={(checked) => handleToggle(config.name, checked)}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Special OAuth connection section for Google Calendar */}
          {config.name === "google_calendar" && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mb-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Conexão OAuth (Recomendado)
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                Conecte sua conta Google para sincronizar eventos automaticamente
              </p>
              <GoogleCalendarConnect
                isConnected={googleCalendarConnected}
                onConnect={() => {
                  setGoogleCalendarConnected(true);
                  checkGoogleCalendarConnection();
                }}
                onDisconnect={() => {
                  setGoogleCalendarConnected(false);
                  checkGoogleCalendarConnection();
                }}
              />
            </div>
          )}

          {/* Configuration fields (shown for ALL integrations including Google Calendar) */}
          <div className="space-y-4">
            {config.name === "google_calendar" && (
              <div className="pb-2 border-b">
                <h4 className="font-semibold text-sm text-gray-700">
                  Configuração Manual (Fallback)
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  Configure credenciais OAuth manualmente caso a conexão automática não funcione
                </p>
              </div>
            )}

            {/* Redirect URI for Google Calendar - Read-only field */}
            {config.name === "google_calendar" && (
              <div className="space-y-2">
                <Label htmlFor="google-calendar-redirect-uri">
                  Redirect URI
                </Label>
                <div className="relative">
                  <Input
                    id="google-calendar-redirect-uri"
                    type="text"
                    value={
                      formData[config.name]?.redirectUri || 
                      `${typeof window !== 'undefined' ? window.location.origin : 'https://www.imogest.pt'}/api/google-calendar/callback`
                    }
                    onChange={(e) => handleInputChange(config.name, "redirectUri", e.target.value)}
                    className="pr-20 bg-gray-50"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const redirectUri = `${typeof window !== 'undefined' ? window.location.origin : 'https://www.imogest.pt'}/api/google-calendar/callback`;
                      navigator.clipboard.writeText(redirectUri);
                      toast({
                        title: "✅ Copiado!",
                        description: "Redirect URI copiado para a área de transferência",
                      });
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Copiar
                  </button>
                </div>
                <p className="text-sm text-gray-500">
                  Cole este URL nos Authorized Redirect URIs no Google Cloud Console
                </p>
              </div>
            )}

            {config.fields.map((field) => {
              const fieldId = `${config.name}-${field.key}`;
              const isPassword = field.type === "password";
              const showPassword = showPasswords[fieldId];

              return (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={fieldId}>
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  <div className="relative">
                    <Input
                      id={fieldId}
                      type={isPassword && !showPassword ? "password" : "text"}
                      placeholder={field.placeholder}
                      value={formData[config.name]?.[field.key] || ""}
                      onChange={(e) => handleInputChange(config.name, field.key, e.target.value)}
                      className="pr-10"
                    />
                    {isPassword && (
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility(fieldId)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                  {field.helpText && (
                    <p className="text-sm text-gray-500">{field.helpText}</p>
                  )}
                </div>
              );
            })}
          </div>

          {!hasCredentials && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                ℹ️ Preencha os campos obrigatórios e clique em "Guardar Configuração" para configurar esta integração.
              </AlertDescription>
            </Alert>
          )}

          {hasChanges && hasCredentials && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                ⚠️ Tem alterações não guardadas. Clique em "Guardar Configuração" antes de testar.
              </AlertDescription>
            </Alert>
          )}

          {data.test_status === "failed" && data.test_message && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{data.test_message}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-2 pt-4">
            <Button
              onClick={() => handleSave(config.name)}
              disabled={isSaving || !hasChanges}
              className="flex-1"
            >
              {isSaving ? (
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
            {config.testEndpoint && (
              <Button
                onClick={() => handleTest(config.name)}
                disabled={isTesting || !canTest}
                variant="outline"
                title={
                  !hasCredentials 
                    ? "Guarde a configuração primeiro" 
                    : hasChanges 
                    ? "Guarde as alterações antes de testar" 
                    : "Testar conexão"
                }
              >
                {isTesting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    A testar...
                  </>
                ) : (
                  <>
                    <TestTube className="h-4 w-4 mr-2" />
                    Testar
                  </>
                )}
              </Button>
            )}
            <Button variant="ghost" size="icon" asChild>
              <a href={config.docsUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  const paymentIntegrations = integrations.filter((i) =>
    ["stripe", "eupago"].includes(i.integration_name)
  );
  const communicationIntegrations = integrations.filter((i) =>
    ["whatsapp", "gmail"].includes(i.integration_name)
  );
  const toolsIntegrations = integrations.filter((i) =>
    ["google_calendar", "google_maps"].includes(i.integration_name)
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Integrações</h1>
          <p className="text-gray-600 mt-2">
            Configure as credenciais de APIs externas para ativar funcionalidades avançadas
          </p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Todas as credenciais são armazenadas de forma segura e encriptadas. Nunca partilhe as suas chaves API.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="tools" className="space-y-6">
          <TabsList>
            <TabsTrigger value="tools">
              <MapPin className="h-4 w-4 mr-2" />
              Ferramentas
            </TabsTrigger>
            <TabsTrigger value="communication">
              <MessageCircle className="h-4 w-4 mr-2" />
              Comunicação
            </TabsTrigger>
            <TabsTrigger value="payment">
              <CreditCard className="h-4 w-4 mr-2" />
              Pagamentos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tools" className="space-y-6">
            {toolsIntegrations.map((integration) => {
              const config = INTEGRATIONS[integration.integration_name];
              return config ? renderIntegrationCard(config, integration) : null;
            })}
          </TabsContent>

          <TabsContent value="communication" className="space-y-6">
            {communicationIntegrations.map((integration) => {
              const config = INTEGRATIONS[integration.integration_name];
              return config ? renderIntegrationCard(config, integration) : null;
            })}
          </TabsContent>

          <TabsContent value="payment" className="space-y-6">
            {paymentIntegrations.map((integration) => {
              const config = INTEGRATIONS[integration.integration_name];
              return config ? renderIntegrationCard(config, integration) : null;
            })}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}