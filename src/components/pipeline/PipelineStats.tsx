import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Euro, TrendingUp, AlertCircle } from "lucide-react";
import type { LeadWithContacts } from "@/services/leadsService";

interface PipelineStatsProps {
  leads: LeadWithContacts[];
}

export function PipelineStats({ leads }: PipelineStatsProps) {
  const totalLeads = leads.length;
  const activeLeads = leads.filter((l) => !["won", "lost"].includes(l.status)).length;
  
  const totalValue = leads.reduce((sum, lead) => sum + (Number(lead.budget) || 0), 0);
  
  const conversionRate = totalLeads > 0
    ? ((leads.filter((l) => l.status === "won").length / totalLeads) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalLeads}</div>
          <p className="text-xs text-muted-foreground">
            {activeLeads} ativos no pipeline
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Valor em Pipeline</CardTitle>
          <Euro className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(totalValue)}
          </div>
          <p className="text-xs text-muted-foreground">
            Soma dos orçamentos
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{conversionRate}%</div>
          <p className="text-xs text-muted-foreground">
            Leads ganhos vs total
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Novos este Mês</CardTitle>
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {leads.filter(l => {
              const date = new Date(l.created_at);
              const now = new Date();
              return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
            }).length}
          </div>
          <p className="text-xs text-muted-foreground">
            Leads criados este mês
          </p>
        </CardContent>
      </Card>
    </div>
  );
}