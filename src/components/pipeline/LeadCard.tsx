import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Mail, Phone, Euro, Calendar, MessageCircle, UserCheck, Edit, Trash2 } from "lucide-react";
import type { LeadWithContacts } from "@/services/leadsService";
import { convertLeadToContact } from "@/services/contactsService";
import { useToast } from "@/hooks/use-toast";

interface LeadCardProps {
  lead: LeadWithContacts;
  onClick?: () => void;
  onDelete?: (id: string) => void;
  onConvertSuccess?: () => void;
}

export function LeadCard({ lead, onClick, onDelete, onConvertSuccess }: LeadCardProps) {
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [converting, setConverting] = useState(false);
  const { toast } = useToast();

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

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

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleSMS = (e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleConvertClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConvertDialogOpen(true);
  };

  const handleConfirmConvert = async () => {
    try {
      setConverting(true);
      await convertLeadToContact(lead.id, lead);
      
      toast({
        title: "Lead convertida com sucesso!",
        description: `${lead.name} foi adicionado aos contactos.`,
      });

      setConvertDialogOpen(false);
      
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

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(lead.id);
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

  return (
    <>
      <Card
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className={`relative p-6 hover:shadow-lg transition-shadow cursor-grab ${
          isDragging ? "opacity-50" : ""
        }`}
      >
        {/* Delete Button - Top Right */}
        <button
          onClick={handleDelete}
          className="absolute top-4 right-4 text-red-500 hover:text-red-700 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>

        {/* Lead Name */}
        <h3 className="text-lg font-semibold text-gray-900 mb-3 pr-6">
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
        <div className="space-y-2 mb-4 text-sm text-gray-600">
          {lead.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-gray-400" />
              <span className="truncate">{lead.email}</span>
            </div>
          )}
          {lead.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-gray-400" />
              <span>{lead.phone}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Euro className="h-4 w-4 text-gray-400" />
            <span>Até {formatBudget(lead.budget)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span>Criado a {formatDate(lead.created_at)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {/* Email, SMS and WhatsApp Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleEmail}
              className="text-purple-600 border-purple-200 hover:bg-purple-50 hover:text-purple-700"
            >
              <Mail className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSMS}
              className="text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700"
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleWhatsApp}
              className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
          </div>

          {/* Convert and Edit Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleConvertClick}
              className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
              <UserCheck className="h-4 w-4 mr-1" />
              Converter
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onClick}
            >
              <Edit className="h-4 w-4 mr-1" />
              Editar
            </Button>
          </div>
        </div>
      </Card>

      {/* Convert Confirmation Dialog */}
      <AlertDialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Converter Lead em Contacto</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                Tem a certeza que deseja converter <strong>{lead.name}</strong> em contacto permanente?
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
    </>
  );
}