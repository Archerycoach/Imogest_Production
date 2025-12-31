import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Edit, Trash2, Phone, Mail, Euro, Calendar, MessageCircle, UserCheck, FileText, Eye, Clock, Plus, MessageSquare, CheckCircle, Users, User, CalendarDays, DollarSign, MapPin, Home, BedDouble, Bath, Ruler, Banknote } from "lucide-react";
import type { LeadWithContacts } from "@/services/leadsService";
import { assignLead } from "@/services/leadsService";
import { convertLeadToContact } from "@/services/contactsService";
import { createInteraction, getInteractionsByLead } from "@/services/interactionsService";
import type { InteractionWithDetails } from "@/services/interactionsService";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { getUserProfile, getUsersForAssignment } from "@/services/profileService";
import { QuickTaskDialog } from "@/components/QuickTaskDialog";
import { QuickEventDialog } from "@/components/QuickEventDialog";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

interface LeadsListProps {
  leads: LeadWithContacts[];
  onEdit: (lead: LeadWithContacts) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
  onConvertSuccess?: () => void;
  onRefresh?: () => void;
}

export function LeadsList({ leads, onEdit, onDelete, isLoading, onConvertSuccess, onRefresh }: LeadsListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedLead, setSelectedLead] = useState<LeadWithContacts | null>(null);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [interactionDialogOpen, setInteractionDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [leadInteractions, setLeadInteractions] = useState<any[]>([]);
  const [loadingInteractions, setLoadingInteractions] = useState(false);
  const [converting, setConverting] = useState(false);
  const [creatingInteraction, setCreatingInteraction] = useState(false);
  const [interactionForm, setInteractionForm] = useState({
    type: "phone_call",
    subject: "",
    content: "",
    outcome: "",
  });
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [availableAgents, setAvailableAgents] = useState<any[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string>("");
  const { toast } = useToast();
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [selectedLeadForTask, setSelectedLeadForTask] = useState<LeadWithContacts | null>(null);

  useEffect(() => {
    loadCurrentUserRole();
  }, []);

  const loadCurrentUserRole = async () => {
    try {
      const profile = await getUserProfile();
      if (profile) {
        setCurrentUserRole(profile.role);
      }
    } catch (error) {
      console.error("Error loading user role:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "contacted":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "qualified":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "proposal":
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case "negotiation":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "won":
        return "bg-green-100 text-green-800 border-green-200";
      case "lost":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "buyer":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "seller":
        return "bg-green-100 text-green-800 border-green-200";
      case "both":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "new":
        return "Novo";
      case "contacted":
        return "Contactado";
      case "qualified":
        return "Qualificado";
      case "proposal":
        return "Proposta";
      case "negotiation":
        return "Negociação";
      case "won":
        return "Ganho";
      case "lost":
        return "Perdido";
      default:
        return status;
    }
  };

  const getTypeLabel = (type: string) => {
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

  const handleWhatsApp = (lead: LeadWithContacts) => {
    if (!lead.phone) {
      toast({
        title: "Sem número de telefone",
        description: "Esta lead não tem um número de telefone associado.",
        variant: "destructive",
      });
      return;
    }

    const cleanPhone = lead.phone.replace(/\D/g, "");
    const phoneWithCountry = cleanPhone.startsWith("351") ? cleanPhone : `351${cleanPhone}`;
    const whatsappUrl = `https://wa.me/${phoneWithCountry}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleEmail = (lead: LeadWithContacts) => {
    if (!lead.email) {
      toast({
        title: "Sem email",
        description: "Esta lead não tem um email associado.",
        variant: "destructive",
      });
      return;
    }

    window.location.href = `mailto:${lead.email}`;
  };

  const handleSMS = (lead: LeadWithContacts) => {
    if (!lead.phone) {
      toast({
        title: "Sem número de telefone",
        description: "Esta lead não tem um número de telefone associado.",
        variant: "destructive",
      });
      return;
    }

    const cleanPhone = lead.phone.replace(/\D/g, "");
    const phoneWithCountry = cleanPhone.startsWith("351") ? cleanPhone : `351${cleanPhone}`;
    window.location.href = `sms:+${phoneWithCountry}`;
  };

  const handleConvertClick = (lead: LeadWithContacts) => {
    setSelectedLead(lead);
    setConvertDialogOpen(true);
  };

  const handleConfirmConvert = async () => {
    if (!selectedLead) return;

    try {
      setConverting(true);
      await convertLeadToContact(selectedLead.id, selectedLead);
      
      toast({
        title: "Lead convertida com sucesso!",
        description: `${selectedLead.name} foi adicionado aos contactos.`,
      });

      setConvertDialogOpen(false);
      setSelectedLead(null);
      
      if (onConvertSuccess) {
        onConvertSuccess();
      }
    } catch (error: any) {
      console.error("Error converting lead:", error);
      toast({
        title: "Erro ao converter lead",
        description: error.message || "Ocorreu um erro ao converter a lead.",
        variant: "destructive",
      });
    } finally {
      setConverting(false);
    }
  };

  const handleInteractionClick = (lead: LeadWithContacts) => {
    setSelectedLead(lead);
    setInteractionForm({
      type: "call",
      subject: "",
      content: "",
      outcome: "",
    });
    setInteractionDialogOpen(true);
  };

  const handleCreateInteraction = async () => {
    if (!selectedLead) return;

    try {
      setCreatingInteraction(true);
      await createInteraction({
        interaction_type: interactionForm.type,
        subject: interactionForm.subject || null,
        content: interactionForm.content || null,
        outcome: interactionForm.outcome || null,
        lead_id: selectedLead.id,
        contact_id: null,
        property_id: null,
      });

      toast({
        title: "Interação criada!",
        description: "A interação foi registrada com sucesso.",
      });

      setInteractionDialogOpen(false);
      setSelectedLead(null);
    } catch (error: any) {
      console.error("Error creating interaction:", error);
      toast({
        title: "Erro ao criar interação",
        description: error.message || "Ocorreu um erro ao criar a interação.",
        variant: "destructive",
      });
    } finally {
      setCreatingInteraction(false);
    }
  };

  const handleAssignClick = async (lead: any) => {
    try {
      setSelectedLead(lead);
      setSelectedAgentId(lead.assigned_to || "");
      
      const agents = await getUsersForAssignment();
      setAvailableAgents(agents);
      setAssignDialogOpen(true);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao carregar agentes disponíveis",
        variant: "destructive",
      });
    }
  };

  const handleAssignLead = async () => {
    if (!selectedLead || !selectedAgentId) return;

    try {
      setAssigning(true);
      
      await assignLead(selectedLead.id, selectedAgentId);
      
      toast({
        title: "Sucesso",
        description: "Lead atribuída com sucesso!",
      });
      
      setAssignDialogOpen(false);
      onRefresh?.();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atribuir lead",
        variant: "destructive",
      });
    } finally {
      setAssigning(false);
    }
  };

  const canAssignLeads = currentUserRole === "admin" || currentUserRole === "team_lead";

  const handleViewDetails = async (lead: LeadWithContacts) => {
    setSelectedLead(lead);
    setDetailsDialogOpen(true);
    setLoadingInteractions(true);
    
    try {
      const interactions = await getInteractionsByLead(lead.id);
      setLeadInteractions(interactions);
    } catch (error) {
      console.error("Error loading interactions:", error);
      toast({
        title: "Erro ao carregar interações",
        description: "Não foi possível carregar o histórico de interações.",
        variant: "destructive",
      });
    } finally {
      setLoadingInteractions(false);
    }
  };

  const handleTaskClick = (lead: LeadWithContacts) => {
    setSelectedLeadForTask(lead);
    setTaskDialogOpen(true);
  };

  const handleEventClick = (lead: LeadWithContacts) => {
    setSelectedLeadForTask(lead);
    setEventDialogOpen(true);
  };

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case "call":
        return <Phone className="h-4 w-4" />;
      case "email":
        return <Mail className="h-4 w-4" />;
      case "whatsapp":
      case "sms":
        return <MessageCircle className="h-4 w-4" />;
      case "meeting":
      case "video_call":
        return <Calendar className="h-4 w-4" />;
      case "note":
        return <FileText className="h-4 w-4" />;
      default:
        return <MessageCircle className="h-4 w-4" />;
    }
  };

  const getInteractionTypeLabel = (type: string) => {
    switch (type) {
      case "call":
        return "Ligação";
      case "email":
        return "Email";
      case "whatsapp":
        return "WhatsApp";
      case "sms":
        return "SMS";
      case "meeting":
        return "Reunião";
      case "video_call":
        return "Videochamada";
      case "note":
        return "Nota";
      default:
        return type;
    }
  };

  const getInteractionTypeColor = (type: string) => {
    switch (type) {
      case "phone_call":
        return "text-blue-600 bg-blue-50";
      case "email":
        return "text-purple-600 bg-purple-50";
      case "whatsapp":
        return "text-green-600 bg-green-50";
      case "sms":
        return "text-orange-600 bg-orange-50";
      case "meeting":
        return "text-indigo-600 bg-indigo-50";
      case "video_call":
        return "text-pink-600 bg-pink-50";
      case "note":
        return "text-gray-600 bg-gray-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("pt-PT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  };

  const formatBudget = (budget: number | null) => {
    if (!budget) return "-";
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(budget);
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone?.toLowerCase().includes(searchTerm.toLowerCase());

    // Lead "both" appears in both "buyer" and "seller" filters
    const matchesType = 
      filterType === "all" || 
      lead.lead_type === filterType ||
      (lead.lead_type === "both" && (filterType === "buyer" || filterType === "seller"));

    return matchesSearch && matchesType;
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome, email ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filter Tabs - WITHOUT "Ambos" button */}
        <div className="flex gap-2">
          <Button
            variant={filterType === "all" ? "default" : "outline"}
            onClick={() => setFilterType("all")}
            className={filterType === "all" ? "bg-blue-600 hover:bg-blue-700" : ""}
          >
            Todos
          </Button>
          <Button
            variant={filterType === "buyer" ? "default" : "outline"}
            onClick={() => setFilterType("buyer")}
            className={filterType === "buyer" ? "bg-blue-600 hover:bg-blue-700" : ""}
          >
            Compradores
          </Button>
          <Button
            variant={filterType === "seller" ? "default" : "outline"}
            onClick={() => setFilterType("seller")}
            className={filterType === "seller" ? "bg-blue-600 hover:bg-blue-700" : ""}
          >
            Vendedores
          </Button>
        </div>

        {/* Leads Grid */}
        {filteredLeads.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>Nenhuma lead encontrada</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLeads.map((lead) => (
              <Card key={lead.id} className="relative p-6 hover:shadow-lg transition-shadow">
                {/* Edit and Delete Buttons - Top Right */}
                <div className="absolute top-4 right-4 flex gap-2">
                  <button
                    onClick={() => onEdit(lead)}
                    className="text-blue-500 hover:text-blue-700 transition-colors"
                    title="Editar"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(lead.id)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                    title="Apagar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Lead Name */}
                <h3 className="text-lg font-semibold text-gray-900 mb-3 pr-16">
                  {lead.name}
                </h3>

                {/* Badges */}
                <div className="flex gap-2 mb-4">
                  <Badge variant="outline" className={getTypeColor(lead.lead_type)}>
                    {getTypeLabel(lead.lead_type)}
                  </Badge>
                  <Badge variant="outline" className={getStatusColor(lead.status)}>
                    {getStatusLabel(lead.status)}
                  </Badge>
                </div>

                {/* Contact Information */}
                <div className="space-y-3 mb-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="truncate">{lead.email || "Sem email"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                    <span>{lead.phone || "Sem telefone"}</span>
                  </div>

                  {/* Buyer Specific Fields */}
                  {(lead.lead_type === 'buyer' || lead.lead_type === 'both') && (
                    lead.property_type || lead.location_preference || lead.bedrooms || lead.min_area || lead.budget || lead.needs_financing
                  ) && (
                    <div className="mt-3 pt-3 border-t border-gray-100 bg-blue-50/50 p-3 rounded-md space-y-2">
                      <p className="font-semibold text-blue-900 mb-2 text-sm">Preferências de Compra:</p>
                      {lead.property_type && (
                        <div className="flex items-center gap-2 text-sm">
                          <Home className="h-4 w-4 text-blue-600" />
                          <span className="capitalize">
                            {lead.property_type === 'apartment' ? 'Apartamento' : 
                             lead.property_type === 'house' ? 'Moradia' : 
                             lead.property_type === 'land' ? 'Terreno' :
                             lead.property_type === 'commercial' ? 'Comercial' :
                             lead.property_type === 'office' ? 'Escritório' :
                             lead.property_type === 'warehouse' ? 'Armazém' :
                             lead.property_type}
                          </span>
                        </div>
                      )}
                      {lead.location_preference && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-blue-600" />
                          <span>{lead.location_preference}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-4 flex-wrap">
                        {lead.bedrooms && (
                          <div className="flex items-center gap-1.5 text-sm">
                            <BedDouble className="h-4 w-4 text-blue-600" />
                            <span className="font-medium">T{lead.bedrooms}</span>
                          </div>
                        )}
                        {lead.min_area && (
                          <div className="flex items-center gap-1.5 text-sm">
                            <Ruler className="h-4 w-4 text-blue-600" />
                            <span>{lead.min_area}m² min</span>
                          </div>
                        )}
                      </div>
                      {lead.budget && (
                        <div className="flex items-center gap-2 text-sm">
                          <Euro className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">Até {formatBudget(lead.budget)}</span>
                        </div>
                      )}
                      {lead.needs_financing && (
                        <div className="flex items-center gap-2 text-sm">
                          <Banknote className="h-4 w-4 text-blue-600" />
                          <span className="text-blue-800 font-semibold bg-blue-100 px-2 py-0.5 rounded">
                            Recorre a Crédito
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Seller Specific Fields */}
                  {(lead.lead_type === 'seller' || lead.lead_type === 'both') && (
                    lead.location_preference || lead.bedrooms || lead.bathrooms || lead.property_area || lead.desired_price
                  ) && (
                    <div className="mt-3 pt-3 border-t border-gray-100 bg-green-50/50 p-3 rounded-md space-y-2">
                      <p className="font-semibold text-green-900 mb-2 text-sm">Imóvel para Venda:</p>
                      {lead.location_preference && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-green-600" />
                          <span>{lead.location_preference}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-4 flex-wrap">
                        {lead.bedrooms && (
                          <div className="flex items-center gap-1.5 text-sm">
                            <BedDouble className="h-4 w-4 text-green-600" />
                            <span className="font-medium">T{lead.bedrooms}</span>
                          </div>
                        )}
                        {lead.bathrooms && (
                          <div className="flex items-center gap-1.5 text-sm">
                            <Bath className="h-4 w-4 text-green-600" />
                            <span>{lead.bathrooms} WC</span>
                          </div>
                        )}
                      </div>
                      {lead.property_area && (
                        <div className="flex items-center gap-2 text-sm">
                          <Ruler className="h-4 w-4 text-green-600" />
                          <span className="font-medium">{lead.property_area} m²</span>
                        </div>
                      )}
                      {lead.desired_price && (
                        <div className="flex items-center gap-2 text-sm">
                          <Euro className="h-4 w-4 text-green-600" />
                          <span className="font-semibold text-green-800">{formatBudget(lead.desired_price)}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 pt-2 text-xs text-gray-400">
                    <Calendar className="h-3 w-3" />
                    <span>Criado a {formatDate(lead.created_at)}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  {/* Quick Communication */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`mailto:${lead.email}`)}
                      className="flex-1"
                    >
                      <Mail className="h-4 w-4 mr-1" />
                      <span className="text-xs">Email</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`sms:${lead.phone}`)}
                      className="flex-1"
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      <span className="text-xs">SMS</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        window.open(`https://wa.me/${lead.phone?.replace(/[^0-9]/g, "")}`)
                      }
                      className="flex-1"
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      <span className="text-xs">WhatsApp</span>
                    </Button>
                  </div>

                  {/* Management Actions */}
                  <div className="flex gap-2">
                    {/* Ver Detalhes */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(lead)}
                      className="flex-1"
                      title="Ver Detalhes"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      <span className="text-xs">Ver</span>
                    </Button>

                    {/* Actions Dropdown Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="flex-1">
                          <Plus className="h-4 w-4 mr-1" />
                          <span className="text-xs">Ações</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem onClick={() => handleTaskClick(lead)}>
                          <CalendarDays className="h-4 w-4 mr-2 text-blue-600" />
                          Nova Tarefa
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEventClick(lead)}>
                          <Calendar className="h-4 w-4 mr-2 text-purple-600" />
                          Novo Evento
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleInteractionClick(lead)}>
                          <FileText className="h-4 w-4 mr-2 text-orange-600" />
                          Nova Interação
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleConvertClick(lead)}>
                          <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                          Converter em Contacto
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Atribuir Agente (só admin/team_lead) */}
                    {canAssignLeads && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAssignClick(lead)}
                        className="flex-1"
                        title="Atribuir Agente"
                      >
                        <Users className="h-4 w-4 mr-1" />
                        <span className="text-xs">Atribuir</span>
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Convert Confirmation Dialog */}
      <AlertDialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Converter Lead em Contacto</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                Tem a certeza que deseja converter <strong>{selectedLead?.name}</strong> em contacto permanente?
                <br /><br />
                Esta ação irá:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Adicionar o contacto à sua lista de contactos</li>
                  <li>Manter o status atual da lead</li>
                  <li>Permitir configurar mensagens automáticas</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={converting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmConvert}
              disabled={converting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {converting ? "Convertendo..." : "Confirmar Conversão"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Interaction Dialog */}
      <Dialog open={interactionDialogOpen} onOpenChange={setInteractionDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova Interação com {selectedLead?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="type">Tipo de Interação *</Label>
              <Select
                value={interactionForm.type}
                onValueChange={(value: any) =>
                  setInteractionForm({ ...interactionForm, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Ligação</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="meeting">Reunião</SelectItem>
                  <SelectItem value="video_call">Videochamada</SelectItem>
                  <SelectItem value="note">Nota</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="subject">Assunto</Label>
              <Input
                id="subject"
                value={interactionForm.subject}
                onChange={(e) =>
                  setInteractionForm({ ...interactionForm, subject: e.target.value })
                }
                placeholder="Ex: Apresentação de imóvel"
              />
            </div>

            <div>
              <Label htmlFor="content">Notas da Interação</Label>
              <Textarea
                id="content"
                value={interactionForm.content}
                onChange={(e) =>
                  setInteractionForm({ ...interactionForm, content: e.target.value })
                }
                placeholder="Descreva o que foi discutido..."
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="outcome">Resultado</Label>
              <Input
                id="outcome"
                value={interactionForm.outcome}
                onChange={(e) =>
                  setInteractionForm({ ...interactionForm, outcome: e.target.value })
                }
                placeholder="Ex: Interessado, Não atende, Agendou visita, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setInteractionDialogOpen(false)}
              disabled={creatingInteraction}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateInteraction}
              disabled={!interactionForm.type || creatingInteraction}
              className="bg-gradient-to-r from-blue-600 to-purple-600"
            >
              {creatingInteraction ? "Criando..." : "Criar Interação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog with Interactions Timeline */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Detalhes da Lead - {selectedLead?.name}</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-6">
            {/* Lead Information */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-500">Nome</p>
                <p className="font-medium">{selectedLead?.name}</p>
              </div>
              {selectedLead?.email && (
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{selectedLead.email}</p>
                </div>
              )}
              {selectedLead?.phone && (
                <div>
                  <p className="text-sm text-gray-500">Telefone</p>
                  <p className="font-medium">{selectedLead.phone}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">Tipo</p>
                <Badge variant="outline" className={getTypeColor(selectedLead?.lead_type || "")}>
                  {getTypeLabel(selectedLead?.lead_type || "")}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <Badge variant="outline" className={getStatusColor(selectedLead?.status || "")}>
                  {getStatusLabel(selectedLead?.status || "")}
                </Badge>
              </div>
              {selectedLead?.budget && (
                <div>
                  <p className="text-sm text-gray-500">Orçamento</p>
                  <p className="font-medium">{formatBudget(selectedLead.budget)}</p>
                </div>
              )}
            </div>

            {/* Lead Info */}
            <div className="space-y-2 text-sm">
              {selectedLead?.email && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="h-4 w-4" />
                  <span>{selectedLead.email}</span>
                </div>
              )}
              {selectedLead?.phone && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="h-4 w-4" />
                  <span>{selectedLead.phone}</span>
                </div>
              )}
              {selectedLead?.budget && (
                <div className="flex items-center gap-2 text-gray-600">
                  <DollarSign className="h-4 w-4" />
                  <span>Até €{selectedLead.budget.toLocaleString()}</span>
                </div>
              )}
              {selectedLead?.created_at && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Criado a {new Date(selectedLead.created_at).toLocaleDateString()}
                  </span>
                </div>
              )}
              {selectedLead?.assigned_user && (
                <div className="flex items-center gap-2 text-gray-600">
                  <User className="h-4 w-4" />
                  <span className="font-medium">
                    Atribuído a: {selectedLead.assigned_user.full_name || selectedLead.assigned_user.email}
                  </span>
                </div>
              )}
            </div>

            {/* Interactions Timeline */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Histórico de Comunicação
                </h3>
                <Button
                  size="sm"
                  onClick={() => {
                    setDetailsDialogOpen(false);
                    setTimeout(() => handleInteractionClick(selectedLead!), 100);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Nova Interação
                </Button>
              </div>

              {loadingInteractions ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : leadInteractions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma interação registrada ainda</p>
                  <p className="text-sm">Clique em "Nova Interação" para começar</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {leadInteractions.map((interaction) => (
                    <Card key={interaction.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full ${getInteractionTypeColor(interaction.interaction_type)}`}>
                          {getInteractionIcon(interaction.interaction_type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium">
                                {getInteractionTypeLabel(interaction.interaction_type)}
                                {interaction.subject && ` - ${interaction.subject}`}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(interaction.interaction_date).toLocaleString("pt-PT", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                            {interaction.outcome && (
                              <Badge variant="secondary" className="text-xs">
                                {interaction.outcome}
                              </Badge>
                            )}
                          </div>
                          {interaction.content && (
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">
                              {interaction.content}
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setDetailsDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Agent Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Atribuir Lead a Agente</DialogTitle>
            <DialogDescription>
              Selecione o agente que ficará responsável por esta lead
            </DialogDescription>
          </DialogHeader>

          {selectedLead && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">{selectedLead.name}</p>
                <p className="text-sm text-gray-600">{selectedLead.email}</p>
              </div>

              <div>
                <Label htmlFor="agent">Agente</Label>
                <Select
                  value={selectedAgentId}
                  onValueChange={setSelectedAgentId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um agente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Nenhum (não atribuído)</SelectItem>
                    {availableAgents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        <div className="flex items-center gap-2">
                          <span>{agent.full_name || agent.email}</span>
                          {agent.role === "team_lead" && (
                            <Badge variant="outline" className="text-xs">
                              Team Lead
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAssignDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAssignLead}
              disabled={assigning}
            >
              {assigning ? "Atribuindo..." : "Atribuir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Task Dialog */}
      {selectedLeadForTask && (
        <QuickTaskDialog
          open={taskDialogOpen}
          onOpenChange={setTaskDialogOpen}
          leadId={selectedLeadForTask.id}
          contactId={null}
          entityName={selectedLeadForTask.name}
          onSuccess={() => {
            setSelectedLeadForTask(null);
          }}
        />
      )}

      {/* Quick Event Dialog */}
      {selectedLeadForTask && (
        <QuickEventDialog
          open={eventDialogOpen}
          onOpenChange={setEventDialogOpen}
          leadId={selectedLeadForTask.id}
          contactId={null}
          entityName={selectedLeadForTask.name}
          onSuccess={() => {
            setSelectedLeadForTask(null);
          }}
        />
      )}
    </>
  );
}