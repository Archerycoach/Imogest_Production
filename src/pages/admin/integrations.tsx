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
} from "lucide-react";
import {
  getAllIntegrations,
  updateIntegration,
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

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      const data = await getAllIntegrations();
      setIntegrations(data);

      // Initialize form data
      const initialFormData: Record<string, Record<string, string>> = {};
      data.forEach((integration) => {
        initialFormData[integration.integration_name] = integration.settings;
      });
      setFormData(initialFormData);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar integrações",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (integrationName: string) => {
    try {
      setSaving(integrationName);
      const integration = integrations.find((i) => i.integration_name === integrationName);
      if (!integration) return;

      await updateIntegration(
        integrationName,
        formData[integrationName] || {},
        integration.is_active
      );

      // Sync to Supabase secrets for Edge Functions
      await syncToSupabaseSecrets(integrationName);

      toast({
        title: "Configuração salva!",
        description: "As credenciais foram atualizadas com sucesso.",
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
      setTesting(integrationName);
      const result = await testIntegration(integrationName);

      toast({
        title: result.success ? "Teste bem-sucedido!" : "Teste falhou",
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

      await updateIntegration(integrationName, integration.settings, isActive);

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

    return (
      <Card key={config.name}>
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
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar Configuração
            </Button>
            {config.testEndpoint && (
              <Button
                onClick={() => handleTest(config.name)}
                disabled={isTesting}
                variant="outline"
              >
                {isTesting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Testar
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

  // Group integrations by category
  const paymentIntegrations = integrations.filter((i) =>
    ["stripe", "eupago"].includes(i.integration_name)
  );
  const communicationIntegrations = integrations.filter((i) =>
    ["whatsapp", "sendgrid", "twilio"].includes(i.integration_name)
  );
  const toolsIntegrations = integrations.filter((i) =>
    ["google_calendar", "google_maps", "firebase"].includes(i.integration_name)
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

        <Tabs defaultValue="communication" className="space-y-6">
          <TabsList>
            <TabsTrigger value="communication">
              <MessageCircle className="h-4 w-4 mr-2" />
              Comunicação
            </TabsTrigger>
            <TabsTrigger value="payment">
              <CreditCard className="h-4 w-4 mr-2" />
              Pagamentos
            </TabsTrigger>
            <TabsTrigger value="tools">
              <MapPin className="h-4 w-4 mr-2" />
              Ferramentas
            </TabsTrigger>
          </TabsList>

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

          <TabsContent value="tools" className="space-y-6">
            {toolsIntegrations.map((integration) => {
              const config = INTEGRATIONS[integration.integration_name];
              return config ? renderIntegrationCard(config, integration) : null;
            })}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}