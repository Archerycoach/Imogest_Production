import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Globe, MessageSquare, Calendar, CreditCard, Check, AlertCircle } from "lucide-react";
import { getPaymentSettings, updatePaymentSettings } from "@/services/adminService";

export default function IntegrationsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  
  // Payment Settings
  const [stripeSettings, setStripeSettings] = useState({
    public_key: "",
    secret_key: "",
    webhook_secret: "",
    is_active: false
  });

  const [eupagoSettings, setEupagoSettings] = useState({
    api_key: "",
    base_url: "https://sandbox.eupago.pt",
    is_active: false
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await getPaymentSettings();
      
      const stripe = settings.find(s => s.key === "stripe_settings")?.value as any;
      if (stripe) setStripeSettings(stripe);

      const eupago = settings.find(s => s.key === "eupago_settings")?.value as any;
      if (eupago) setEupagoSettings(eupago);

    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStripe = async () => {
    try {
      await updatePaymentSettings("stripe_settings", stripeSettings);
      toast({ title: "Sucesso", description: "Configurações Stripe guardadas." });
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao guardar configurações.", variant: "destructive" });
    }
  };

  const handleSaveEupago = async () => {
    try {
      await updatePaymentSettings("eupago_settings", eupagoSettings);
      toast({ title: "Sucesso", description: "Configurações Eupago guardadas." });
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao guardar configurações.", variant: "destructive" });
    }
  };

  if (loading) return <Layout><div>A carregar...</div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integrações</h1>
          <p className="text-muted-foreground">Gerir conexões com serviços externos</p>
        </div>

        <Tabs defaultValue="payments">
          <TabsList>
            <TabsTrigger value="payments">Pagamentos</TabsTrigger>
            <TabsTrigger value="portals">Portais Imobiliários</TabsTrigger>
          </TabsList>

          <TabsContent value="payments" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                  <CardTitle>Stripe</CardTitle>
                </div>
                <CardDescription>Configuração para pagamentos com cartão de crédito</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={stripeSettings.is_active}
                    onCheckedChange={(c) => setStripeSettings({...stripeSettings, is_active: c})}
                  />
                  <Label>Ativar Pagamentos Stripe</Label>
                </div>
                <div className="grid gap-2">
                  <Label>Chave Pública</Label>
                  <Input 
                    value={stripeSettings.public_key}
                    onChange={(e) => setStripeSettings({...stripeSettings, public_key: e.target.value})}
                    type="password"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Chave Secreta</Label>
                  <Input 
                    value={stripeSettings.secret_key}
                    onChange={(e) => setStripeSettings({...stripeSettings, secret_key: e.target.value})}
                    type="password"
                  />
                </div>
                <Button onClick={handleSaveStripe}>Guardar Configuração</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-emerald-600" />
                  <CardTitle>Eupago (MBWay / Multibanco)</CardTitle>
                </div>
                <CardDescription>Gateway de pagamentos portuguesa</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={eupagoSettings.is_active}
                    onCheckedChange={(c) => setEupagoSettings({...eupagoSettings, is_active: c})}
                  />
                  <Label>Ativar Pagamentos Eupago</Label>
                </div>
                <div className="grid gap-2">
                  <Label>API Key</Label>
                  <Input 
                    value={eupagoSettings.api_key}
                    onChange={(e) => setEupagoSettings({...eupagoSettings, api_key: e.target.value})}
                    type="password"
                  />
                </div>
                <Button onClick={handleSaveEupago}>Guardar Configuração</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="portals">
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Funcionalidade de portais em desenvolvimento.
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}