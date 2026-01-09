import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Edit,
  Trash2,
  Mail,
  Phone,
  MessageCircle,
  MessageSquare,
  CheckCircle,
  Eye,
  Users,
  CalendarDays,
  Calendar,
  FileText,
  Euro,
  MapPin,
  Home,
  BedDouble,
  Bath,
  Ruler,
  Banknote,
} from "lucide-react";
import type { LeadWithContacts } from "@/services/leadsService";

interface LeadCardProps {
  lead: LeadWithContacts;
  showArchived: boolean;
  canAssignLeads: boolean;
  onEdit: (lead: LeadWithContacts) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
  onConvert: (lead: LeadWithContacts) => void;
  onViewDetails: (lead: LeadWithContacts) => void;
  onAssign: (lead: LeadWithContacts) => void;
  onTask: (lead: LeadWithContacts) => void;
  onEvent: (lead: LeadWithContacts) => void;
  onInteraction: (lead: LeadWithContacts) => void;
  onEmail: (lead: LeadWithContacts) => void;
  onSMS: (lead: LeadWithContacts) => void;
  onWhatsApp: (lead: LeadWithContacts) => void;
}

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
  const labels: Record<string, string> = {
    new: "Novo",
    contacted: "Contactado",
    qualified: "Qualificado",
    proposal: "Proposta",
    negotiation: "Negociação",
    won: "Ganho",
    lost: "Perdido",
  };
  return labels[status] || status;
};

const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    buyer: "Comprador",
    seller: "Vendedor",
    both: "Ambos",
  };
  return labels[type] || type;
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

export function LeadCard({
  lead,
  showArchived,
  canAssignLeads,
  onEdit,
  onDelete,
  onRestore,
  onConvert,
  onViewDetails,
  onAssign,
  onTask,
  onEvent,
  onInteraction,
  onEmail,
  onSMS,
  onWhatsApp,
}: LeadCardProps) {
  const isBuyer = lead.lead_type === "buyer" || lead.lead_type === "both";
  const isSeller = lead.lead_type === "seller" || lead.lead_type === "both";

  return (
    <Card className="relative p-6 hover:shadow-lg transition-shadow">
      <div className="absolute top-4 right-4 flex gap-2">
        {!showArchived ? (
          <>
            <button
              onClick={() => onEdit(lead)}
              className="text-blue-500 hover:text-blue-700 transition-colors"
              title="Editar"
              type="button"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={() => onConvert(lead)}
              className="text-green-500 hover:text-green-700 transition-colors"
              title="Converter em Contacto"
              type="button"
            >
              <CheckCircle className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(lead.id)}
              className="text-red-500 hover:text-red-700 transition-colors"
              title="Arquivar"
              type="button"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        ) : (
          <button
            onClick={() => onRestore(lead.id)}
            className="text-green-500 hover:text-green-700 transition-colors"
            title="Restaurar Lead"
            type="button"
          >
            <CheckCircle className="h-4 w-4" />
          </button>
        )}
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-3 pr-16">
        {lead.name}
      </h3>

      <div className="flex gap-2 mb-4">
        <Badge variant="outline" className={getTypeColor(lead.lead_type)}>
          {getTypeLabel(lead.lead_type)}
        </Badge>
        <Badge variant="outline" className={getStatusColor(lead.status)}>
          {getStatusLabel(lead.status)}
        </Badge>
      </div>

      <div className="space-y-3 mb-4 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-gray-400 shrink-0" />
          <span className="truncate">{lead.email || "Sem email"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-gray-400 shrink-0" />
          <span>{lead.phone || "Sem telefone"}</span>
        </div>

        {isBuyer && (lead.property_type || lead.location_preference || lead.bedrooms || lead.min_area || lead.budget || lead.needs_financing) && (
          <div className="mt-3 pt-3 border-t border-gray-100 bg-blue-50/50 p-3 rounded-md space-y-2">
            <p className="font-semibold text-blue-900 mb-2 text-sm">Preferências de Compra:</p>
            {lead.property_type && (
              <div className="flex items-center gap-2 text-sm">
                <Home className="h-4 w-4 text-blue-600" />
                <span className="capitalize">
                  {lead.property_type === "apartment" ? "Apartamento" : 
                   lead.property_type === "house" ? "Moradia" : 
                   lead.property_type === "land" ? "Terreno" :
                   lead.property_type === "commercial" ? "Comercial" :
                   lead.property_type === "office" ? "Escritório" :
                   lead.property_type === "warehouse" ? "Armazém" :
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
            {lead.is_development && lead.development_name && (
              <div className="flex items-center gap-2 text-sm">
                <Home className="h-4 w-4 text-blue-600" />
                <span className="font-semibold">🏢 {lead.development_name}</span>
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

        {isSeller && (lead.location_preference || lead.bedrooms || lead.bathrooms || lead.property_area || lead.desired_price) && (
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

      <div className="space-y-2">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEmail(lead)}
            className="flex-1"
            type="button"
          >
            <Mail className="h-4 w-4 mr-1" />
            <span className="text-xs">Email</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSMS(lead)}
            className="flex-1"
            type="button"
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            <span className="text-xs">SMS</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onWhatsApp(lead)}
            className="flex-1"
            type="button"
          >
            <MessageCircle className="h-4 w-4 mr-1" />
            <span className="text-xs">WhatsApp</span>
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(lead)}
            className="flex-1"
            title="Ver Detalhes"
            type="button"
          >
            <Eye className="h-4 w-4 mr-1" />
            <span className="text-xs">Ver</span>
          </Button>

          {canAssignLeads && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAssign(lead)}
              className="flex-1"
              title="Atribuir Agente"
              type="button"
            >
              <Users className="h-4 w-4 mr-1" />
              <span className="text-xs">Atribuir</span>
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onTask(lead)}
            className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50"
            title="Nova Tarefa"
            type="button"
          >
            <CalendarDays className="h-4 w-4 mr-1" />
            <span className="text-xs">Tarefa</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onEvent(lead)}
            className="flex-1 border-purple-200 text-purple-700 hover:bg-purple-50"
            title="Novo Evento"
            type="button"
          >
            <Calendar className="h-4 w-4 mr-1" />
            <span className="text-xs">Evento</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onInteraction(lead)}
            className="flex-1 border-orange-200 text-orange-700 hover:bg-orange-50"
            title="Nova Interação"
            type="button"
          >
            <FileText className="h-4 w-4 mr-1" />
            <span className="text-xs">Interação</span>
          </Button>
        </div>
      </div>
    </Card>
  );
}