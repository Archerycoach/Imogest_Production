import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, User, Lock, Building2, Bell, Calendar, Upload, Loader2, Save, Mail, Key } from "lucide-react";
import { getUserProfile, updateUserProfile, uploadAvatar } from "@/services/profileService";
import { updatePassword, getSession, signOut } from "@/services/authService";
import { GoogleCalendarConnect } from "@/components/GoogleCalendarConnect";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { GmailConnect } from "@/components/GmailConnect";

export default function Settings() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    marketing: false,
  });
  
  // Integration States
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  
  // Auth check
  const [authChecking, setAuthChecking] = useState(true);
  
  // Profile form
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [replyEmail, setReplyEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  
  // Password form
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Avatar
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  
  // Notifications
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);

  useEffect(() => {
    checkAuthentication();
    checkIntegrations();
  }, []);

  // Handle Gmail OAuth Callback
  useEffect(() => {
    const handleGmailCallback = async () => {
      const { gmail_code, error } = router.query;

      if (error) {
        toast({
          title: "Erro na conexão Gmail",
          description: decodeURIComponent(error as string),
          variant: "destructive",
        });
        // Remove params
        router.replace("/settings", undefined, { shallow: true });
        return;
      }

      if (gmail_code) {
        try {
          setLoading(true);
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;

          const response = await fetch("/api/gmail/exchange", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ code: gmail_code }),
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || "Failed to exchange code");
          }

          toast({
            title: "Gmail conectado!",
            description: "Sua conta foi vinculada com sucesso.",
          });
          
          setGmailConnected(true);
        } catch (err: any) {
          toast({
            title: "Erro ao conectar Gmail",
            description: err.message,
            variant: "destructive",
          });
        } finally {
          setLoading(false);
          // Remove query params
          router.replace("/settings", undefined, { shallow: true });
        }
      }
    };

    if (router.isReady) {
      handleGmailCallback();
    }
  }, [router.isReady, router.query]);

  const checkIntegrations = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Check Google Calendar
    const { data: calData } = await supabase
      .from("user_integrations")
      .select("is_active")
      .eq("user_id", session.user.id)
      .eq("integration_type", "google_calendar")
      .maybeSingle();
      
    setGoogleCalendarConnected(calData?.is_active || false);

    // Check Gmail
    const { data: gmailData } = await supabase
      .from("user_integrations")
      .select("is_active")
      .eq("user_id", session.user.id)
      .eq("integration_type", "gmail")
      .maybeSingle();

    setGmailConnected(gmailData?.is_active || false);
  };

  const checkAuthentication = async () => {
    try {
      setAuthChecking(true);
      const session = await getSession();
      
      if (!session) {
        toast({
          title: "Sessão expirada",
          description: "Por favor, faça login novamente.",
          variant: "destructive",
        });
        router.push("/login");
        return;
      }

      await loadProfile();
    } catch (error) {
      console.error("Authentication error:", error);
      
      try {
        await signOut();
      } catch (signOutError) {
        console.error("Error signing out:", signOutError);
      }
      
      toast({
        title: "Erro de autenticação",
        description: "Por favor, faça login novamente.",
        variant: "destructive",
      });
      router.push("/login");
    } finally {
      setAuthChecking(false);
    }
  };

  const loadProfile = async () => {
    try {
      const data = await getUserProfile();
      if (data) {
        console.log("[Settings] Profile loaded:", data);
        setProfile(data);
        setFullName(data.full_name || "");
        setEmail(data.email || "");
        setPhone(data.phone || "");
        setReplyEmail(data.reply_email || "");
        setAvatarPreview(data.avatar_url || "");
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    setLoading(true);
    try {
      console.log("[Settings] Updating profile with:", {
        full_name: profile.full_name,
        email: profile.email,
        phone: profile.phone,
        reply_email: profile.reply_email,
        email_daily_tasks: profile.email_daily_tasks,
        email_daily_events: profile.email_daily_events,
        email_new_lead_assigned: profile.email_new_lead_assigned,
      });

      await updateUserProfile(profile.id, {
        full_name: profile.full_name,
        email: profile.email,
        phone: profile.phone,
        reply_email: profile.reply_email,
        email_daily_tasks: profile.email_daily_tasks,
        email_daily_events: profile.email_daily_events,
        email_new_lead_assigned: profile.email_new_lead_assigned,
      });
      
      toast({
        title: "Perfil atualizado",
        description: "As suas alterações foram guardadas com sucesso.",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o perfil.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As palavras-passe não coincidem.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Erro",
        description: "A palavra-passe deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      await updatePassword(newPassword);
      
      toast({
        title: "Palavra-passe alterada",
        description: "A sua palavra-passe foi atualizada com sucesso.",
      });

      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Error changing password:", error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar a palavra-passe.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  // Show loading while checking authentication
  if (authChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">A verificar autenticação...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto p-6 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Menu
            </Button>
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Definições
              </h1>
              <p className="text-slate-600">Gerir perfil e preferências</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="profile">
              <User className="h-4 w-4 mr-2" />
              Perfil
            </TabsTrigger>
            <TabsTrigger value="password">
              <Lock className="h-4 w-4 mr-2" />
              Segurança
            </TabsTrigger>
            <TabsTrigger value="company">
              <Building2 className="h-4 w-4 mr-2" />
              Empresa
            </TabsTrigger>
            <TabsTrigger value="integrations">
              <Key className="h-4 w-4 mr-2" />
              Integrações
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4 mr-2" />
              Notificações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Informação Pessoal</CardTitle>
                <CardDescription>Atualize os seus dados de perfil</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome Completo</Label>
                  <Input 
                    value={profile?.full_name || ""} 
                    onChange={e => setProfile(prev => prev ? {...prev, full_name: e.target.value} : null)}
                    placeholder="Ex: João Silva"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Email da Conta</Label>
                  <Input 
                    value={profile?.email || ""} 
                    disabled 
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-slate-500">
                    Este é o email usado para login. Não pode ser alterado.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Email para Respostas</Label>
                  <Input 
                    type="email"
                    value={profile?.reply_email || ""} 
                    onChange={e => setProfile(prev => prev ? {...prev, reply_email: e.target.value} : null)}
                    placeholder="Ex: joao.silva@imobiliaria.pt"
                  />
                  <p className="text-xs text-slate-500">
                    📧 Quando enviar emails via Imogest, os clientes responderão para este endereço.
                    Se deixar vazio, será usado o email da conta.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input 
                    value={profile?.phone || ""} 
                    onChange={e => setProfile(prev => prev ? {...prev, phone: e.target.value} : null)}
                    placeholder="Ex: +351 912 345 678"
                  />
                </div>

                <Button onClick={updateProfile} disabled={loading}>
                  <Save className="mr-2 h-4 w-4" />
                  {loading ? "A guardar..." : "Guardar Alterações"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="password">
            <Card>
              <CardHeader>
                <CardTitle>Alterar Palavra-passe</CardTitle>
                <CardDescription>
                  Escolha uma palavra-passe forte para proteger a sua conta
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <Label htmlFor="newPassword">Nova Palavra-passe</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Confirmar Palavra-passe</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Digite novamente"
                      required
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={loading}
                      className="bg-gradient-to-r from-blue-600 to-purple-600"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          A alterar...
                        </>
                      ) : (
                        "Alterar Palavra-passe"
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="company">
            <Card>
              <CardHeader>
                <CardTitle>Dados da Empresa</CardTitle>
                <CardDescription>Informações sobre a sua empresa</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={updateProfile} className="space-y-4">
                  <div>
                    <Label htmlFor="companyName">Nome da Empresa</Label>
                    <Input
                      id="companyName"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Ex: Imobiliária XYZ"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={loading}
                      className="bg-gradient-to-r from-blue-600 to-purple-600"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          A guardar...
                        </>
                      ) : (
                        "Guardar Alterações"
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Contas Conectadas</CardTitle>
                <CardDescription>
                  Gerencie suas conexões com serviços externos.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                <div className="space-y-4">
                  <h3 className="font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4" /> Email
                  </h3>
                  <GmailConnect 
                    isConnected={gmailConnected} 
                    onConnect={() => setGmailConnected(true)}
                    onDisconnect={() => setGmailConnected(false)}
                  />
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Calendário
                  </h3>
                  <GoogleCalendarConnect
                    isConnected={googleCalendarConnected}
                    onConnect={() => setGoogleCalendarConnected(true)}
                    onDisconnect={() => setGoogleCalendarConnected(false)}
                  />
                </div>

              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Preferências de Notificação</CardTitle>
                <CardDescription>
                  Escolha como você deseja receber atualizações.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notificações por Email</Label>
                    <p className="text-sm text-gray-500">
                      Receba atualizações sobre suas leads e tarefas.
                    </p>
                  </div>
                  <Switch
                    checked={notifications.email}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, email: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notificações Push</Label>
                    <p className="text-sm text-gray-500">
                      Receba alertas em tempo real no navegador.
                    </p>
                  </div>
                  <Switch
                    checked={notifications.push}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, push: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}