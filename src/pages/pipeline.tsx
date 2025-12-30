import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import {
  TrendingUp,
  ShoppingCart,
  Home,
  Download,
  Mail,
  MessageSquare,
  Users,
  DollarSign,
  Target,
  Phone,
  Euro,
  MapPin,
  Award,
  UserMinus,
  Calendar,
  User,
} from "lucide-react";
import { getLeads, updateLead } from "@/services/leadsService";
import { exportLeadsToExcel } from "@/services/excelService";
import type { Database } from "@/integrations/supabase/types";
import { SubscriptionGuard } from "@/components/SubscriptionGuard";

type Lead = Database["public"]["Tables"]["leads"]["Row"];

// Pipeline stages configuration
const BUYER_STAGES = [
  { id: "new", label: "Novo", color: "bg-slate-100 text-slate-700" },
  { id: "contacted", label: "Contactado", color: "bg-blue-100 text-blue-700" },
  { id: "qualified", label: "Qualificado", color: "bg-purple-100 text-purple-700" },
  { id: "viewing", label: "Visitas", color: "bg-cyan-100 text-cyan-700" },
  { id: "followup", label: "Seguimento", color: "bg-amber-100 text-amber-700" },
  { id: "negotiation", label: "Negociação", color: "bg-orange-100 text-orange-700" },
  { id: "won", label: "Ganho", color: "bg-emerald-100 text-emerald-700" },
  { id: "lost", label: "Perdido", color: "bg-red-100 text-red-700" },
];

const SELLER_STAGES = [
  { id: "new", label: "Novo", color: "bg-slate-100 text-slate-700" },
  { id: "contacted", label: "Contactado", color: "bg-blue-100 text-blue-700" },
  { id: "qualified", label: "Qualificado", color: "bg-purple-100 text-purple-700" },
  { id: "evaluation", label: "Avaliação", color: "bg-amber-100 text-amber-700" },
  { id: "followup", label: "Seguimento", color: "bg-yellow-100 text-yellow-700" },
  { id: "negotiation", label: "Negociação", color: "bg-orange-100 text-orange-700" },
  { id: "won", label: "Ganho", color: "bg-emerald-100 text-emerald-700" },
  { id: "lost", label: "Perdido", color: "bg-red-100 text-red-700" },
];

const getLeadTypeLabel = (type: string) => {
  switch (type) {
    case "buyer":
      return "Comprador";
    case "seller":
      return "Vendedor";
    case "both":
      return "Ambos";
    default:
      return type;
  }
};

const getStatusColor = (status: string) => {
  switch (status as any) {
    case "new":
      return "bg-slate-100 text-slate-700";
    case "contacted":
      return "bg-blue-100 text-blue-700";
    case "qualified":
      return "bg-purple-100 text-purple-700";
    case "viewing":
      return "bg-cyan-100 text-cyan-700";
    case "followup":
      return "bg-amber-100 text-amber-700";
    case "negotiation":
      return "bg-orange-100 text-orange-700";
    case "won":
      return "bg-emerald-100 text-emerald-700";
    case "lost":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export default function PipelinePage() {
  const router = useRouter();
  const { type } = router.query;
  const [activeTab, setActiveTab] = useState<"buyers" | "sellers">(
    type === "sellers" ? "sellers" : "buyers"
  );
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeads();
  }, []);

  useEffect(() => {
    if (type === "sellers" || type === "buyers") {
      setActiveTab(type);
    }
  }, [type]);

  const loadLeads = async () => {
    try {
      setLoading(true);
      const data = await getLeads();
      setLeads(data);
    } catch (error) {
      console.error("Error loading leads:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter leads by type (buyer/seller/both)
  const buyerLeads = leads.filter(
    (lead) => lead.lead_type === "buyer" || lead.lead_type === "both"
  );
  const sellerLeads = leads.filter(
    (lead) => lead.lead_type === "seller" || lead.lead_type === "both"
  );

  // Group leads by stage
  const getLeadsByStage = (stageId: string, leadsList: Lead[]) => {
    return leadsList.filter((lead) => lead.status === stageId);
  };

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;

    try {
      // Update lead status in database
      await updateLead(draggableId, { status: destination.droppableId });
      
      // Reload leads to reflect changes
      await loadLeads();
    } catch (error) {
      console.error("Error updating lead status:", error);
    }
  };

  const handleExport = () => {
    const leadsToExport = activeTab === "buyers" ? buyerLeads : sellerLeads;
    exportLeadsToExcel(leadsToExport);
  };

  const renderPipeline = (stages: typeof BUYER_STAGES, leadsList: Lead[]) => {
    return (
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-8 gap-4">
          {stages.map((stage) => {
            const stageLeads = getLeadsByStage(stage.id, leadsList);
            const totalValue = stageLeads.reduce(
              (sum, lead) => sum + (Number(lead.budget) || 0),
              0
            );

            return (
              <div key={stage.id} className="flex flex-col">
                <Card className="border-2 border-gray-200 shadow-sm mb-2">
                  <CardHeader className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={stage.color}>{stage.label}</Badge>
                      <span className="text-sm font-bold text-gray-700">
                        {stageLeads.length}
                      </span>
                    </div>
                    {totalValue > 0 && (
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Euro className="h-3 w-3" />
                        <span>{totalValue.toLocaleString("pt-PT")}€</span>
                      </div>
                    )}
                  </CardHeader>
                </Card>

                <Droppable droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 space-y-2 p-2 rounded-lg border-2 border-dashed min-h-[400px] ${
                        snapshot.isDraggingOver
                          ? "bg-blue-50 border-blue-300"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      {stageLeads.map((lead, index) => (
                        <Draggable
                          key={lead.id}
                          draggableId={lead.id}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`border-2 border-gray-200 shadow-sm cursor-move transition-all ${
                                snapshot.isDragging
                                  ? "shadow-xl rotate-2 scale-105"
                                  : "hover:shadow-md"
                              }`}
                            >
                              <CardContent className="p-4">
                                <h4 className="font-bold text-gray-900 mb-2">
                                  {lead.name}
                                </h4>
                                
                                {lead.email && (
                                  <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                                    <Mail className="h-3 w-3" />
                                    <span className="truncate">{lead.email}</span>
                                  </div>
                                )}

                                {lead.phone && (
                                  <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                                    <Phone className="h-3 w-3" />
                                    <span>{lead.phone}</span>
                                  </div>
                                )}

                                {lead.budget && (
                                  <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                                    <Euro className="h-3 w-3" />
                                    <span className="font-semibold">
                                      {Number(lead.budget).toLocaleString("pt-PT")}€
                                    </span>
                                  </div>
                                )}

                                {lead.location_preference && (
                                  <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                                    <MapPin className="h-3 w-3" />
                                    <span className="truncate">
                                      {lead.location_preference}
                                    </span>
                                  </div>
                                )}

                                <div className="flex items-center justify-between mt-2">
                                  <span className="text-sm font-medium text-slate-900">
                                    {new Intl.NumberFormat("pt-PT", {
                                      style: "currency",
                                      currency: "EUR",
                                    }).format(lead.budget || 0)}
                                  </span>
                                  {(lead as any).score > 0 && (
                                    <Badge variant={(lead as any).score >= 70 ? "default" : "secondary"} className="text-xs">
                                      Score: {(lead as any).score}
                                    </Badge>
                                  )}
                                </div>

                                <div className="flex gap-1 mt-3">
                                  {lead.email && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="flex-1 h-7 text-xs"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.location.href = `mailto:${lead.email}`;
                                      }}
                                    >
                                      <Mail className="h-3 w-3" />
                                    </Button>
                                  )}
                                  {lead.phone && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="flex-1 h-7 text-xs"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const cleanPhone = lead.phone!.replace(/\D/g, "");
                                        window.open(`https://wa.me/${cleanPhone}`, "_blank");
                                      }}
                                    >
                                      <MessageSquare className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <TrendingUp className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">A carregar funil de vendas...</p>
        </div>
      </div>
    );
  }

  return (
    <SubscriptionGuard>
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6 max-w-[1600px]">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Funil de Vendas</h1>
          <p className="text-gray-600">Visualize e gerencie seu pipeline de vendas</p>
        </div>

        <Tabs defaultValue="buyers" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="buyers">👥 Funil Compradores</TabsTrigger>
            <TabsTrigger value="sellers">🏠 Funil Vendedores</TabsTrigger>
          </TabsList>

          <TabsContent value="buyers" className="space-y-6">
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="border-2 border-blue-200 bg-blue-50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600">Total Leads</p>
                      <p className="text-3xl font-bold text-blue-900">{buyerLeads.length}</p>
                    </div>
                    <Users className="h-12 w-12 text-blue-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-purple-200 bg-purple-50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-600">Valor Total</p>
                      <p className="text-3xl font-bold text-purple-900">
                        {new Intl.NumberFormat("pt-PT", {
                          style: "currency",
                          currency: "EUR",
                          minimumFractionDigits: 0,
                        }).format(
                          buyerLeads.reduce((sum, lead) => {
                            const budget = typeof lead.budget === "number" ? lead.budget : Number(lead.budget) || 0;
                            return sum + budget;
                          }, 0)
                        )}
                      </p>
                    </div>
                    <DollarSign className="h-12 w-12 text-purple-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-emerald-200 bg-emerald-50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-emerald-600">Taxa Conversão</p>
                      <p className="text-3xl font-bold text-emerald-900">
                        {buyerLeads.length > 0
                          ? ((buyerLeads.filter((l) => l.status === "won").length / buyerLeads.length) * 100).toFixed(1)
                          : 0}%
                      </p>
                    </div>
                    <TrendingUp className="h-12 w-12 text-emerald-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-orange-200 bg-orange-50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-600">Em Negociação</p>
                      <p className="text-3xl font-bold text-orange-900">
                        {buyerLeads.filter((l) => l.status === "negotiation").length}
                      </p>
                    </div>
                    <Target className="h-12 w-12 text-orange-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Button
              onClick={() => exportLeadsToExcel(buyerLeads)}
              className="mb-4"
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>

            {buyerLeads.length === 0 ? (
              <Card className="border-2 border-gray-200 shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="h-16 w-16 text-gray-300 mb-4" />
                  <p className="text-gray-500 text-lg mb-2">
                    Nenhum lead comprador encontrado
                  </p>
                  <p className="text-gray-400 text-sm mb-4">
                    Crie leads do tipo "Comprador" ou "Ambos" para vê-los aqui
                  </p>
                  <Button onClick={() => router.push("/leads")}>
                    Ir para Leads
                  </Button>
                </CardContent>
              </Card>
            ) : (
              renderPipeline(BUYER_STAGES, buyerLeads)
            )}
          </TabsContent>

          <TabsContent value="sellers" className="space-y-6">
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="border-2 border-blue-200 bg-blue-50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600">Total Leads</p>
                      <p className="text-3xl font-bold text-blue-900">{sellerLeads.length}</p>
                    </div>
                    <Users className="h-12 w-12 text-blue-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-purple-200 bg-purple-50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-600">Valor Total</p>
                      <p className="text-3xl font-bold text-purple-900">
                        {new Intl.NumberFormat("pt-PT", {
                          style: "currency",
                          currency: "EUR",
                          minimumFractionDigits: 0,
                        }).format(
                          sellerLeads.reduce((sum, lead) => {
                            const budget = typeof lead.budget === "number" ? lead.budget : Number(lead.budget) || 0;
                            return sum + budget;
                          }, 0)
                        )}
                      </p>
                    </div>
                    <DollarSign className="h-12 w-12 text-purple-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-emerald-200 bg-emerald-50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-emerald-600">Taxa Conversão</p>
                      <p className="text-3xl font-bold text-emerald-900">
                        {sellerLeads.length > 0
                          ? ((sellerLeads.filter((l) => l.status === "won").length / sellerLeads.length) * 100).toFixed(1)
                          : 0}%
                      </p>
                    </div>
                    <TrendingUp className="h-12 w-12 text-emerald-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-orange-200 bg-orange-50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-600">Em Negociação</p>
                      <p className="text-3xl font-bold text-orange-900">
                        {sellerLeads.filter((l) => l.status === "negotiation").length}
                      </p>
                    </div>
                    <Target className="h-12 w-12 text-orange-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Button
              onClick={() => exportLeadsToExcel(sellerLeads)}
              className="mb-4"
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>

            {sellerLeads.length === 0 ? (
              <Card className="border-2 border-gray-200 shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Home className="h-16 w-16 text-gray-300 mb-4" />
                  <p className="text-gray-500 text-lg mb-2">
                    Nenhum lead vendedor encontrado
                  </p>
                  <p className="text-gray-400 text-sm mb-4">
                    Crie leads do tipo "Vendedor" ou "Ambos" para vê-los aqui
                  </p>
                  <Button onClick={() => router.push("/leads")}>
                    Ir para Leads
                  </Button>
                </CardContent>
              </Card>
            ) : (
              renderPipeline(SELLER_STAGES, sellerLeads)
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </SubscriptionGuard>
  );
}