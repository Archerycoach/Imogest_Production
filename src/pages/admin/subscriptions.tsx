import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  Edit,
  Plus,
  Users as UsersIcon,
  Target,
  ArrowLeft,
  Loader2,
  Settings,
  Home,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import {
  getAllSubscriptions,
  getSubscriptionStats,
  updateSubscriptionStatus,
  activateSubscription,
  extendSubscription,
  createSubscription,
  type SubscriptionWithPlan,
} from "@/services/subscriptionService";
import { 
  getAllUsers, 
  getAllSubscriptionPlans,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  toggleSubscriptionPlanStatus,
} from "@/services/adminService";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type SubscriptionPlan = Database["public"]["Tables"]["subscription_plans"]["Row"];

interface PlanFormData {
  name: string;
  description: string;
  price: number;
  currency: string;
  billing_interval: "monthly" | "yearly";
  stripe_price_id: string;
  stripe_product_id: string;
  features: string[];
  limits: {
    max_users: number | null;
    max_leads: number | null;
    max_properties: number | null;
  };
  is_active: boolean;
}

export default function AdminSubscriptionsPage() {
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithPlan[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [trialDays, setTrialDays] = useState(14);

  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionWithPlan | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [extensionMonths, setExtensionMonths] = useState(1);

  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [planFormData, setPlanFormData] = useState<PlanFormData>({
    name: "",
    description: "",
    price: 0,
    currency: "EUR",
    billing_interval: "monthly",
    stripe_price_id: "",
    stripe_product_id: "",
    features: [],
    limits: {
      max_users: null,
      max_leads: null,
      max_properties: null,
    },
    is_active: true,
  });
  const [newFeature, setNewFeature] = useState("");

  useEffect(() => {
    checkAccess();
    loadData();
  }, []);

  const checkAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      router.push("/dashboard");
    }
  };

  const loadData = async () => {
    try {
      const [subsData, usersResult, plansData, statsData] = await Promise.all([
        getAllSubscriptions(),
        getAllUsers(),
        getAllSubscriptionPlans(),
        getSubscriptionStats(),
      ]);

      setSubscriptions(subsData);
      
      if (usersResult.error) {
        console.error("Error loading users:", usersResult.error);
      } else {
        setUsers(usersResult.data || []);
      }
      
      setPlans(plansData);
      setStats(statsData);
    } catch (error) {
      console.error("Error loading subscription data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchUsers = async () => {
      const result = await getAllUsers();
      
      if (result.error) {
        console.error("Error fetching users:", result.error);
      } else {
        setUsers(result.data || []);
      }
    };

    fetchUsers();
  }, []);

  const handleCreateSubscription = async () => {
    if (!selectedUserId || !selectedPlanId) {
      alert("Por favor selecione um utilizador e um plano");
      return;
    }

    try {
      await createSubscription(selectedUserId, selectedPlanId, trialDays);
      await loadData();
      setCreateDialogOpen(false);
      setSelectedUserId("");
      setSelectedPlanId("");
      setTrialDays(14);
    } catch (error) {
      console.error("Error creating subscription:", error);
      alert("Erro ao criar subscrição");
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedSubscription || !newStatus) return;

    try {
      await updateSubscriptionStatus(selectedSubscription.id, newStatus as any);
      await loadData();
      setManageDialogOpen(false);
      setSelectedSubscription(null);
      setNewStatus("");
    } catch (error) {
      console.error("Error updating subscription:", error);
      alert("Erro ao atualizar subscrição");
    }
  };

  const handleActivateSubscription = async (months: number) => {
    if (!selectedSubscription) return;

    try {
      await activateSubscription(selectedSubscription.id, months);
      await loadData();
      setManageDialogOpen(false);
      setSelectedSubscription(null);
    } catch (error) {
      console.error("Error activating subscription:", error);
      alert("Erro ao ativar subscrição");
    }
  };

  const handleExtendSubscription = async () => {
    if (!selectedSubscription) return;

    try {
      await extendSubscription(selectedSubscription.id, extensionMonths);
      await loadData();
      setManageDialogOpen(false);
      setSelectedSubscription(null);
      setExtensionMonths(1);
    } catch (error) {
      console.error("Error extending subscription:", error);
      alert("Erro ao estender subscrição");
    }
  };

  const openPlanDialog = (plan?: SubscriptionPlan) => {
    if (plan) {
      setEditingPlan(plan);
      setPlanFormData({
        name: plan.name,
        description: plan.description || "",
        price: plan.price,
        currency: plan.currency,
        billing_interval: plan.billing_interval as "monthly" | "yearly",
        stripe_price_id: plan.stripe_price_id || "",
        stripe_product_id: plan.stripe_product_id || "",
        features: Array.isArray(plan.features) ? plan.features as string[] : [],
        limits: {
          max_users: (plan.limits as any)?.max_users ?? null,
          max_leads: (plan.limits as any)?.max_leads ?? null,
          max_properties: (plan.limits as any)?.max_properties ?? null,
        },
        is_active: plan.is_active,
      });
    } else {
      setEditingPlan(null);
      setPlanFormData({
        name: "",
        description: "",
        price: 0,
        currency: "EUR",
        billing_interval: "monthly",
        stripe_price_id: "",
        stripe_product_id: "",
        features: [],
        limits: {
          max_users: null,
          max_leads: null,
          max_properties: null,
        },
        is_active: true,
      });
    }
    setPlanDialogOpen(true);
  };

  const handleSavePlan = async () => {
    try {
      if (editingPlan) {
        await updateSubscriptionPlan(editingPlan.id, planFormData);
      } else {
        await createSubscriptionPlan(planFormData);
      }
      await loadData();
      setPlanDialogOpen(false);
      setEditingPlan(null);
    } catch (error) {
      console.error("Error saving plan:", error);
      alert("Erro ao guardar plano");
    }
  };

  const handleTogglePlanStatus = async (planId: string, currentStatus: boolean) => {
    try {
      await toggleSubscriptionPlanStatus(planId, !currentStatus);
      await loadData();
    } catch (error) {
      console.error("Error toggling plan status:", error);
      alert("Erro ao alterar estado do plano");
    }
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setPlanFormData({
        ...planFormData,
        features: [...planFormData.features, newFeature.trim()],
      });
      setNewFeature("");
    }
  };

  const removeFeature = (index: number) => {
    setPlanFormData({
      ...planFormData,
      features: planFormData.features.filter((_, i) => i !== index),
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      trialing: { label: "Teste", className: "bg-blue-100 text-blue-700", icon: Clock },
      active: { label: "Ativa", className: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
      cancelled: { label: "Cancelada", className: "bg-gray-100 text-gray-700", icon: AlertCircle },
      past_due: { label: "Vencida", className: "bg-red-100 text-red-700", icon: AlertCircle },
      unpaid: { label: "Não Paga", className: "bg-orange-100 text-orange-700", icon: AlertCircle },
    };

    const config = statusMap[status as keyof typeof statusMap] || { label: status, className: "bg-gray-100", icon: AlertCircle };
    const Icon = config.icon;

    return (
      <Badge className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const getUserName = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    return user?.full_name || user?.email || "Utilizador Desconhecido";
  };

  const getUserEmail = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    return user?.email || "";
  };

  const filteredSubscriptions = subscriptions.filter((sub) => {
    const userName = getUserName(sub.user_id).toLowerCase();
    const userEmail = getUserEmail(sub.user_id).toLowerCase();
    const matchesSearch = userName.includes(searchTerm.toLowerCase()) || 
                         userEmail.includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || sub.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const usersWithoutSubscription = users.filter(
    (user) => !subscriptions.some((sub) => sub.user_id === user.id && ["trialing", "active"].includes(sub.status))
  );

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["admin"]}>
        <Layout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" onClick={() => router.push("/admin/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Gestão de Subscrições</h1>
              <p className="text-gray-600">Gerir planos, pagamentos e permissões dos utilizadores</p>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            <Card className="border-2 border-blue-200 bg-blue-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-blue-700">Total Subscrições</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold text-blue-900">{stats?.total || 0}</span>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-emerald-200 bg-emerald-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-emerald-700">Ativas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold text-emerald-900">{stats?.active || 0}</span>
                  <CheckCircle className="h-8 w-8 text-emerald-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-blue-200 bg-blue-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-blue-700">Em Teste</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold text-blue-900">{stats?.trial || 0}</span>
                  <Clock className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-red-200 bg-red-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-red-700">Expiradas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold text-red-900">{stats?.expired || 0}</span>
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="subscriptions" className="space-y-6">
            <TabsList className="bg-white border-2 border-gray-200">
              <TabsTrigger value="subscriptions">Subscrições Ativas</TabsTrigger>
              <TabsTrigger value="plans">Planos Disponíveis</TabsTrigger>
              <TabsTrigger value="manage-plans">Gestão de Planos</TabsTrigger>
              <TabsTrigger value="create">Criar Subscrição</TabsTrigger>
            </TabsList>

            <TabsContent value="subscriptions">
              <Card className="border-2 border-gray-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Lista de Subscrições</CardTitle>
                      <CardDescription>Gerir todas as subscrições dos utilizadores</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 mb-6">
                    <div className="flex-1">
                      <Input
                        placeholder="Pesquisar por nome ou email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filtrar por status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="trialing">Em Teste</SelectItem>
                        <SelectItem value="active">Ativas</SelectItem>
                        <SelectItem value="cancelled">Canceladas</SelectItem>
                        <SelectItem value="past_due">Vencidas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Utilizador</TableHead>
                        <TableHead>Plano</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Início</TableHead>
                        <TableHead>Fim</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubscriptions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                            Nenhuma subscrição encontrada
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredSubscriptions.map((sub) => (
                          <TableRow key={sub.id}>
                            <TableCell>
                              <div>
                                <p className="font-semibold text-gray-900">{getUserName(sub.user_id)}</p>
                                <p className="text-sm text-gray-600">{getUserEmail(sub.user_id)}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-semibold text-gray-900">
                                {sub.subscription_plans?.name || "N/A"}
                              </span>
                            </TableCell>
                            <TableCell>{getStatusBadge(sub.status)}</TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {formatDate(sub.current_period_start)}
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {sub.current_period_end ? formatDate(sub.current_period_end) : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedSubscription(sub);
                                  setManageDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Gerir
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="plans">
              <div className="grid md:grid-cols-3 gap-6">
                {plans.map((plan) => (
                  <Card key={plan.id} className="border-2 border-gray-200">
                    <CardHeader>
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <h3 className="font-bold text-lg">{plan.name}</h3>
                          <p className="text-sm text-gray-500">{plan.description}</p>
                        </div>
                        <Badge variant={plan.is_active ? "default" : "secondary"}>
                          {plan.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-500">Preço</span>
                          <span className="font-semibold">€{plan.price}/{plan.billing_interval === "monthly" ? "mês" : "ano"}</span>
                        </div>

                        <div className="space-y-2">
                          <span className="text-xs font-semibold text-gray-500 uppercase">Limites</span>
                          <ul className="text-sm space-y-1">
                            <li className="flex items-center gap-2">
                              <UsersIcon className="h-3 w-3" />
                              {(plan.limits as any)?.max_users || "Ilimitado"} utilizadores
                            </li>
                            <li className="flex items-center gap-2">
                              <Target className="h-3 w-3" />
                              {(plan.limits as any)?.max_leads || "Ilimitado"} leads
                            </li>
                            <li className="flex items-center gap-2">
                              <Home className="h-3 w-3" />
                              {(plan.limits as any)?.max_properties || "Ilimitado"} imóveis
                            </li>
                          </ul>
                        </div>

                        {plan.features && Array.isArray(plan.features) && (plan.features as string[]).length > 0 && (
                          <div className="space-y-2">
                            <span className="text-xs font-semibold text-gray-500 uppercase">Características</span>
                            <ul className="text-sm space-y-1">
                              {(plan.features as string[]).map((feature, idx) => (
                                <li key={idx} className="flex items-center gap-2">
                                  <CheckCircle className="h-3 w-3 text-emerald-600" />
                                  {feature}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="manage-plans">
              <Card className="border-2 border-gray-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Gestão de Planos</CardTitle>
                      <CardDescription>Criar e editar planos de subscrição</CardDescription>
                    </div>
                    <Button onClick={() => openPlanDialog()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Plano
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Preço</TableHead>
                        <TableHead>Intervalo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plans.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                            Nenhum plano configurado
                          </TableCell>
                        </TableRow>
                      ) : (
                        plans.map((plan) => (
                          <TableRow key={plan.id}>
                            <TableCell>
                              <div>
                                <p className="font-semibold text-gray-900">{plan.name}</p>
                                <p className="text-sm text-gray-600">{plan.description}</p>
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold">€{plan.price}</TableCell>
                            <TableCell>
                              {plan.billing_interval === "monthly" ? "Mensal" : "Anual"}
                            </TableCell>
                            <TableCell>
                              <Badge variant={plan.is_active ? "default" : "secondary"}>
                                {plan.is_active ? "Ativo" : "Inativo"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openPlanDialog(plan)}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleTogglePlanStatus(plan.id, plan.is_active)}
                                >
                                  {plan.is_active ? (
                                    <ToggleRight className="h-4 w-4" />
                                  ) : (
                                    <ToggleLeft className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="create">
              <Card className="border-2 border-gray-200">
                <CardHeader>
                  <CardTitle>Criar Nova Subscrição</CardTitle>
                  <CardDescription>Atribuir subscrição a um utilizador</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label>Utilizador</Label>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um utilizador" />
                      </SelectTrigger>
                      <SelectContent>
                        {usersWithoutSubscription.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name || user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Plano</Label>
                    <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um plano" />
                      </SelectTrigger>
                      <SelectContent>
                        {plans.filter(p => p.is_active).map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.name} - €{plan.price}/{plan.billing_interval === "monthly" ? "mês" : "ano"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Dias de Período de Teste</Label>
                    <Input
                      type="number"
                      min="0"
                      max="90"
                      value={trialDays}
                      onChange={(e) => setTrialDays(Number(e.target.value))}
                    />
                  </div>

                  <Button onClick={handleCreateSubscription} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Subscrição
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Dialog open={manageDialogOpen} onOpenChange={setManageDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Gerir Subscrição</DialogTitle>
                <DialogDescription>
                  {selectedSubscription && getUserName(selectedSubscription.user_id)}
                </DialogDescription>
              </DialogHeader>

              {selectedSubscription && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Plano Atual</p>
                      <p className="font-semibold text-gray-900">
                        {selectedSubscription.subscription_plans?.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      {getStatusBadge(selectedSubscription.status)}
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Data de Início</p>
                      <p className="font-semibold text-gray-900">
                        {formatDate(selectedSubscription.current_period_start)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Data de Fim</p>
                      <p className="font-semibold text-gray-900">
                        {selectedSubscription.current_period_end ? formatDate(selectedSubscription.current_period_end) : "-"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label>Alterar Status</Label>
                    <div className="flex gap-2 mt-2">
                      <Select value={newStatus} onValueChange={setNewStatus}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione novo status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Ativar</SelectItem>
                          <SelectItem value="past_due">Suspender (Vencida)</SelectItem>
                          <SelectItem value="cancelled">Cancelar</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button onClick={handleUpdateStatus} disabled={!newStatus}>
                        Atualizar
                      </Button>
                    </div>
                  </div>

                  {selectedSubscription.status === "trialing" && (
                    <div>
                      <Label>Ativar Subscrição (Período)</Label>
                      <div className="flex gap-2 mt-2">
                        <Button variant="outline" onClick={() => handleActivateSubscription(1)}>
                          1 Mês
                        </Button>
                        <Button variant="outline" onClick={() => handleActivateSubscription(6)}>
                          6 Meses
                        </Button>
                        <Button variant="outline" onClick={() => handleActivateSubscription(12)}>
                          12 Meses
                        </Button>
                      </div>
                    </div>
                  )}

                  {selectedSubscription.status === "active" && (
                    <div>
                      <Label>Estender Subscrição</Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          type="number"
                          min="1"
                          max="24"
                          value={extensionMonths}
                          onChange={(e) => setExtensionMonths(Number(e.target.value))}
                          placeholder="Meses"
                        />
                        <Button onClick={handleExtendSubscription}>
                          Estender
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingPlan ? "Editar Plano" : "Criar Novo Plano"}
                </DialogTitle>
                <DialogDescription>
                  Configure as características e limites do plano de subscrição
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nome do Plano *</Label>
                    <Input
                      value={planFormData.name}
                      onChange={(e) => setPlanFormData({ ...planFormData, name: e.target.value })}
                      placeholder="Ex: Plano Básico"
                    />
                  </div>

                  <div>
                    <Label>Preço *</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={planFormData.price}
                      onChange={(e) => setPlanFormData({ ...planFormData, price: Number(e.target.value) })}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <Label>Descrição</Label>
                  <Textarea
                    value={planFormData.description}
                    onChange={(e) => setPlanFormData({ ...planFormData, description: e.target.value })}
                    placeholder="Descreva o plano..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Moeda</Label>
                    <Select 
                      value={planFormData.currency} 
                      onValueChange={(value) => setPlanFormData({ ...planFormData, currency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Intervalo de Faturação</Label>
                    <Select 
                      value={planFormData.billing_interval} 
                      onValueChange={(value: "monthly" | "yearly") => 
                        setPlanFormData({ ...planFormData, billing_interval: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Mensal</SelectItem>
                        <SelectItem value="yearly">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                  <h4 className="font-semibold text-sm">Limites do Plano</h4>
                  <p className="text-xs text-gray-600">
                    Deixe em branco ou 0 para ilimitado
                  </p>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Máx. Utilizadores</Label>
                      <Input
                        type="number"
                        min="0"
                        value={planFormData.limits.max_users || ""}
                        onChange={(e) => setPlanFormData({
                          ...planFormData,
                          limits: { 
                            ...planFormData.limits, 
                            max_users: e.target.value ? Number(e.target.value) : null 
                          }
                        })}
                        placeholder="Ilimitado"
                      />
                    </div>

                    <div>
                      <Label>Máx. Leads</Label>
                      <Input
                        type="number"
                        min="0"
                        value={planFormData.limits.max_leads || ""}
                        onChange={(e) => setPlanFormData({
                          ...planFormData,
                          limits: { 
                            ...planFormData.limits, 
                            max_leads: e.target.value ? Number(e.target.value) : null 
                          }
                        })}
                        placeholder="Ilimitado"
                      />
                    </div>

                    <div>
                      <Label>Máx. Imóveis</Label>
                      <Input
                        type="number"
                        min="0"
                        value={planFormData.limits.max_properties || ""}
                        onChange={(e) => setPlanFormData({
                          ...planFormData,
                          limits: { 
                            ...planFormData.limits, 
                            max_properties: e.target.value ? Number(e.target.value) : null 
                          }
                        })}
                        placeholder="Ilimitado"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                  <h4 className="font-semibold text-sm">Características do Plano</h4>
                  
                  <div className="flex gap-2">
                    <Input
                      value={newFeature}
                      onChange={(e) => setNewFeature(e.target.value)}
                      placeholder="Ex: Relatórios avançados"
                      onKeyPress={(e) => e.key === "Enter" && addFeature()}
                    />
                    <Button type="button" onClick={addFeature}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {planFormData.features.length > 0 && (
                    <div className="space-y-2">
                      {planFormData.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-white rounded">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                            <span className="text-sm">{feature}</span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => removeFeature(idx)}
                          >
                            ✕
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                  <h4 className="font-semibold text-sm">Integração Stripe (Opcional)</h4>
                  
                  <div>
                    <Label>Stripe Product ID</Label>
                    <Input
                      value={planFormData.stripe_product_id}
                      onChange={(e) => setPlanFormData({ ...planFormData, stripe_product_id: e.target.value })}
                      placeholder="prod_xxxxx"
                    />
                  </div>

                  <div>
                    <Label>Stripe Price ID</Label>
                    <Input
                      value={planFormData.stripe_price_id}
                      onChange={(e) => setPlanFormData({ ...planFormData, stripe_price_id: e.target.value })}
                      placeholder="price_xxxxx"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={planFormData.is_active}
                    onChange={(e) => setPlanFormData({ ...planFormData, is_active: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="is_active" className="cursor-pointer">
                    Ativar plano imediatamente
                  </Label>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setPlanDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSavePlan}>
                  {editingPlan ? "Guardar Alterações" : "Criar Plano"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}