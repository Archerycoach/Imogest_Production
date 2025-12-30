import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, CreditCard, Activity, TrendingUp, AlertCircle, Shield } from "lucide-react";
import { 
  getAdminStats, 
  getActivityLogs, 
  getAllUsers,
  getRevenueStats,
  type ActivityLogWithProfile
} from "@/services/adminService";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalLeads: 0,
    totalProperties: 0,
    totalTasks: 0
  });
  const [revenue, setRevenue] = useState({ total: 0, monthly: 0 });
  const [users, setUsers] = useState<Profile[]>([]);
  const [recentActivity, setRecentActivity] = useState<{user: string, action: string, date: string}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkPermission();
    loadDashboardData();
  }, []);

  const checkPermission = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (data?.role !== "admin") {
      router.push("/dashboard");
    }
  };

  const loadDashboardData = async () => {
    try {
      const [statsData, logsData, profilesData, revenueData] = await Promise.all([
        getAdminStats(),
        getActivityLogs(5),
        getAllUsers(),
        getRevenueStats()
      ]);

      setStats(statsData);
      setRevenue(revenueData);

      // Filter internal users
      const internalUsers = profilesData.filter(p => 
        p.role === "admin" || p.role === "team_lead" || p.role === "agent"
      );
      setUsers(internalUsers);

      const activity = logsData.map(log => ({
        user: log.profiles?.full_name || log.profiles?.email || "Unknown",
        action: log.action,
        date: new Date(log.created_at).toLocaleDateString("pt-PT")
      }));

      setRecentActivity(activity);

    } catch (error) {
      console.error("Error loading admin dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Painel de Administração</h1>
          <p className="text-muted-foreground">Visão geral do sistema e métricas principais</p>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Utilizadores</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeUsers} ativos
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{revenue.monthly.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                +20.1% que o mês passado
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Leads Totais</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLeads}</div>
              <p className="text-xs text-muted-foreground">
                Em todo o sistema
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Imóveis</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProperties}</div>
              <p className="text-xs text-muted-foreground">
                Ativos no sistema
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          {/* Recent Activity */}
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Atividade Recente</CardTitle>
              <CardDescription>Últimas ações no sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {recentActivity.length === 0 ? (
                  <p className="text-sm text-gray-500">Sem atividade recente.</p>
                ) : (
                  recentActivity.map((item, i) => (
                    <div key={i} className="flex items-center">
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">{item.user}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.action}
                        </p>
                      </div>
                      <div className="ml-auto font-medium text-sm text-gray-500">{item.date}</div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
              <CardDescription>Gestão do sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start" 
                onClick={() => router.push("/admin/users")}
              >
                <Users className="mr-2 h-4 w-4" />
                Gerir Utilizadores
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => router.push("/admin/subscriptions")}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Gerir Subscrições
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => router.push("/admin/security")}
              >
                <Shield className="mr-2 h-4 w-4" />
                Segurança e Logs
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}