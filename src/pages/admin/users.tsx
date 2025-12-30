import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  getAllUsers, 
  updateUserRole, 
  toggleUserStatus,
  deleteUser,
  createUser,
  getTeamLeads,
  assignAgentToTeamLead,
} from "@/services/adminService";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Users, UserPlus, ArrowLeft, Trash2, Shield, Edit, Loader2 } from "lucide-react";

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  team_lead_id: string | null;
};

type TeamLead = {
  id: string;
  full_name: string | null;
  email: string | null;
};

export default function AdminUsersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<Profile[]>([]);
  const [teamLeads, setTeamLeads] = useState<TeamLead[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  
  // Create user form
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    fullName: "",
    role: "agent" as "admin" | "team_lead" | "agent",
    isActive: true,
    teamLeadId: "" as string | undefined,
  });

  // Edit user form
  const [editUser, setEditUser] = useState({
    role: "agent" as string,
    teamLeadId: "" as string | undefined,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersData, teamLeadsData] = await Promise.all([
        getAllUsers(),
        getTeamLeads(),
      ]);
      setUsers(usersData);
      setTeamLeads(teamLeadsData);
    } catch (error) {
      console.error("Error loading users:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar utilizadores.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    
    try {
      console.log("[Users Page] Creating user with data:", { ...newUser, password: "[REDACTED]" });
      
      await createUser({
        email: newUser.email,
        password: newUser.password,
        fullName: newUser.fullName,
        role: newUser.role,
        isActive: newUser.isActive,
        teamLeadId: newUser.role === "agent" && newUser.teamLeadId ? newUser.teamLeadId : undefined,
      });

      toast({
        title: "✅ Utilizador criado",
        description: `${newUser.fullName} foi criado com sucesso.`,
      });

      setCreateDialogOpen(false);
      setNewUser({
        email: "",
        password: "",
        fullName: "",
        role: "agent",
        isActive: true,
        teamLeadId: undefined,
      });
      
      await loadData();
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast({
        title: "❌ Erro",
        description: error.message || "Erro ao criar utilizador.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    setUpdating(true);
    try {
      // Update role
      await updateUserRole(selectedUser.id, editUser.role);
      
      // Update team lead if agent
      if (editUser.role === "agent") {
        await assignAgentToTeamLead(
          selectedUser.id, 
          editUser.teamLeadId || null
        );
      }

      toast({
        title: "✅ Utilizador atualizado",
        description: "Alterações guardadas com sucesso.",
      });

      setEditDialogOpen(false);
      setSelectedUser(null);
      await loadData();
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast({
        title: "❌ Erro",
        description: error.message || "Erro ao atualizar utilizador.",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await toggleUserStatus(userId, !currentStatus);
      toast({
        title: "✅ Status atualizado",
        description: `Utilizador ${!currentStatus ? "ativado" : "desativado"} com sucesso.`,
      });
      await loadData();
    } catch (error) {
      toast({
        title: "❌ Erro",
        description: "Erro ao atualizar status.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Tem a certeza que deseja eliminar ${userName}?`)) return;
    
    try {
      await deleteUser(userId);
      toast({
        title: "✅ Utilizador eliminado",
        description: `${userName} foi eliminado com sucesso.`,
      });
      await loadData();
    } catch (error) {
      toast({
        title: "❌ Erro",
        description: "Erro ao eliminar utilizador.",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (user: Profile) => {
    setSelectedUser(user);
    setEditUser({
      role: user.role,
      teamLeadId: user.team_lead_id || undefined,
    });
    setEditDialogOpen(true);
  };

  const getRoleBadge = (role: string) => {
    const variants = {
      admin: { bg: "bg-red-100 text-red-700", label: "Admin" },
      team_lead: { bg: "bg-blue-100 text-blue-700", label: "Team Lead" },
      agent: { bg: "bg-green-100 text-green-700", label: "Agente" },
    };
    const config = variants[role as keyof typeof variants] || { bg: "bg-gray-100 text-gray-700", label: role };
    return <Badge className={config.bg}>{config.label}</Badge>;
  };

  const getTeamLeadName = (teamLeadId: string | null) => {
    if (!teamLeadId) return null;
    const teamLead = users.find(u => u.id === teamLeadId);
    return teamLead?.full_name || teamLead?.email || "Desconhecido";
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["admin"]}>
        <div className="min-h-screen bg-white flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto p-6 max-w-7xl">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => router.push("/admin/dashboard")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                  Gestão de Utilizadores
                </h1>
                <p className="text-gray-600">
                  {users.length} utilizadores registados
                </p>
              </div>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)} size="lg">
              <UserPlus className="h-5 w-5 mr-2" />
              Criar Utilizador
            </Button>
          </div>

          <Card className="border-2 border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <Users className="h-5 w-5" />
                Todos os Utilizadores
              </CardTitle>
              <CardDescription>
                Gira roles, status e permissões dos utilizadores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                        {user.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-900">
                            {user.full_name || "Sem nome"}
                          </p>
                          {getRoleBadge(user.role)}
                          {!user.is_active && (
                            <Badge variant="destructive">Inativo</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        {user.role === "agent" && user.team_lead_id && (
                          <p className="text-xs text-blue-600 mt-1">
                            👤 Team Lead: {getTeamLeadName(user.team_lead_id)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(user)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                      <Switch
                        checked={user.is_active}
                        onCheckedChange={() => handleToggleStatus(user.id, user.is_active)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id, user.full_name || user.email || "utilizador")}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Create User Dialog */}
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <form onSubmit={handleCreateUser}>
                <DialogHeader>
                  <DialogTitle>Criar Novo Utilizador</DialogTitle>
                  <DialogDescription>
                    O utilizador receberá as credenciais de acesso automaticamente.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nome Completo *</Label>
                    <Input
                      id="fullName"
                      value={newUser.fullName}
                      onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                      placeholder="Ex: João Silva"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      placeholder="joao@exemplo.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      placeholder="Mínimo 6 caracteres"
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Função *</Label>
                    <Select value={newUser.role} onValueChange={(value: any) => setNewUser({ ...newUser, role: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-red-600" />
                            <span>Administrador</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="team_lead">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-blue-600" />
                            <span>Team Lead</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="agent">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-green-600" />
                            <span>Agente</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {newUser.role === "agent" && (
                    <div className="space-y-2">
                      <Label htmlFor="teamLead">Team Lead (Opcional)</Label>
                      <Select 
                        value={newUser.teamLeadId || "none"} 
                        onValueChange={(value) => setNewUser({ ...newUser, teamLeadId: value === "none" ? undefined : value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar Team Lead" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {teamLeads.map((lead) => (
                            <SelectItem key={lead.id} value={lead.id}>
                              {lead.full_name || lead.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={newUser.isActive}
                      onCheckedChange={(checked) => setNewUser({ ...newUser, isActive: checked })}
                    />
                    <Label htmlFor="isActive">Conta ativa</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={creating}>
                    {creating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        A criar...
                      </>
                    ) : (
                      "Criar Utilizador"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Edit User Dialog */}
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <form onSubmit={handleUpdateUser}>
                <DialogHeader>
                  <DialogTitle>Editar Utilizador</DialogTitle>
                  <DialogDescription>
                    Atualizar função e team lead de {selectedUser?.full_name || selectedUser?.email}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="editRole">Função *</Label>
                    <Select value={editUser.role} onValueChange={(value) => setEditUser({ ...editUser, role: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-red-600" />
                            <span>Administrador</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="team_lead">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-blue-600" />
                            <span>Team Lead</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="agent">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-green-600" />
                            <span>Agente</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {editUser.role === "agent" && (
                    <div className="space-y-2">
                      <Label htmlFor="editTeamLead">Team Lead</Label>
                      <Select 
                        value={editUser.teamLeadId || "none"} 
                        onValueChange={(value) => setEditUser({ ...editUser, teamLeadId: value === "none" ? undefined : value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar Team Lead" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {teamLeads.map((lead) => (
                            <SelectItem key={lead.id} value={lead.id}>
                              {lead.full_name || lead.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={updating}>
                    {updating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        A guardar...
                      </>
                    ) : (
                      "Guardar Alterações"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </ProtectedRoute>
  );
}