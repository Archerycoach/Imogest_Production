import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, User, Lock, Building2, Bell, Calendar, Upload, Loader2, Save } from "lucide-react";
import { getUserProfile, updateUserProfile, uploadAvatar } from "@/services/profileService";
import { updatePassword, getSession, signOut } from "@/services/authService";
import { supabase } from "@/integrations/supabase/client";
import { GoogleCalendarConnect } from "@/components/GoogleCalendarConnect";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  
  // Auth check
  const [authChecking, setAuthChecking] = useState(true);
  
  // Profile form
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
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
  
  // Google Calendar
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      setAuthChecking(true);
      const session = await getSession();
      
      if (!session) {
        // No session - redirect to login
        toast({
          title: "Sessão expirada",
          description: "Por favor, faça login novamente.",
          variant: "destructive",
        });
        router.push("/login");
        return;
      }

      // Session exists - load profile
      await loadProfile();
    } catch (error) {
      console.error("Authentication error:", error);
      
      // Clear invalid session and redirect
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
        setProfile(data);
        setFullName(data.full_name || "");
        setEmail(data.email || "");
        setPhone(data.phone || "");
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
      await updateUserProfile(profile.id, {
        full_name: profile.full_name,
        email: profile.email,
        phone: profile.phone,
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

  const handleDisconnectGoogle = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("user_integrations")
        .update({ is_active: false })
        .eq("user_id", user.id)
        .eq("integration_type", "google_calendar");

      if (error) throw error;

      setGoogleCalendarConnected(false);
      toast({
        title: "Google Calendar desconectado",
        description: "A sincronização foi desativada com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao desconectar",
        description: error.message,
        variant: "destructive",
      });
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
              <Calendar className="h-4 w-4 mr-2" />
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
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input 
                    value={profile?.email || ""} 
                    disabled 
                    className="bg-gray-50"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input 
                    value={profile?.phone || ""} 
                    onChange={e => setProfile(prev => prev ? {...prev, phone: e.target.value} : null)}
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

          <TabsContent value="integrations">
            <Card>
              <CardHeader>
                <CardTitle>Integrações</CardTitle>
                <CardDescription>
                  Conecte serviços externos para melhorar a sua produtividade
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Google Calendar</Label>
                    <p className="text-sm text-gray-500">
                      Sincroniza os teus eventos e tarefas com o Google Calendar
                    </p>
                  </div>
                  <div className="w-[200px]">
                    <GoogleCalendarConnect 
                      isConnected={googleCalendarConnected}
                      onDisconnect={handleDisconnectGoogle}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Preferências de Notificações</CardTitle>
                <CardDescription>
                  Escolha como quer receber notificações
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Notificações por Email</h4>
                    <p className="text-sm text-slate-500">
                      Receber atualizações importantes por email
                    </p>
                  </div>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Notificações Push</h4>
                    <p className="text-sm text-slate-500">
                      Receber alertas instantâneos no navegador
                    </p>
                  </div>
                  <Switch
                    checked={pushNotifications}
                    onCheckedChange={setPushNotifications}
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