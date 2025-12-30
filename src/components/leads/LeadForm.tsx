import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { createLead, updateLead } from "@/services/leadsService";
import { supabase } from "@/integrations/supabase/client";
import type { LeadWithContacts } from "@/services/leadsService";

interface LeadFormProps {
  initialData?: LeadWithContacts;
  onSuccess: () => void;
  onCancel: () => void;
}

export function LeadForm({ initialData, onSuccess, onCancel }: LeadFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    status: "new",
    lead_type: "buyer",
    notes: "",
    budget: "",
    location_preference: "",
    source: "website"
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        email: initialData.email || "",
        phone: initialData.phone || "",
        status: initialData.status || "new",
        lead_type: initialData.lead_type || "buyer",
        notes: initialData.notes || "",
        budget: initialData.budget ? initialData.budget.toString() : "",
        location_preference: initialData.location_preference || "",
        source: initialData.source || "website"
      });
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erro",
          description: "Utilizador não autenticado",
          variant: "destructive",
        });
        return;
      }

      const leadData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        status: formData.status as any,
        lead_type: formData.lead_type as any,
        notes: formData.notes,
        budget: formData.budget ? Number(formData.budget) : null,
        location_preference: formData.location_preference,
        source: formData.source as any,
        user_id: user.id
      };

      if (initialData) {
        await updateLead(initialData.id, leadData);
        toast({
          title: "Sucesso",
          description: "Lead atualizado com sucesso",
        });
      } else {
        await createLead(leadData);
        toast({
          title: "Sucesso",
          description: "Lead criado com sucesso",
        });
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving lead:", error);
      toast({
        title: "Erro",
        description: "Erro ao guardar lead",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? "Editar Lead" : "Novo Lead"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome completo"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+351..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@exemplo.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lead_type">Tipo</Label>
              <Select
                value={formData.lead_type}
                onValueChange={(value) => setFormData({ ...formData, lead_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buyer">Comprador</SelectItem>
                  <SelectItem value="seller">Vendedor</SelectItem>
                  <SelectItem value="both">Ambos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Novo</SelectItem>
                  <SelectItem value="contacted">Contactado</SelectItem>
                  <SelectItem value="qualified">Qualificado</SelectItem>
                  <SelectItem value="proposal">Proposta</SelectItem>
                  <SelectItem value="negotiation">Negociação</SelectItem>
                  <SelectItem value="won">Ganho</SelectItem>
                  <SelectItem value="lost">Perdido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budget">Orçamento (€)</Label>
              <Input
                id="budget"
                type="number"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="source">Origem</Label>
              <Select
                value={formData.source}
                onValueChange={(value) => setFormData({ ...formData, source: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione origem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="referral">Referência</SelectItem>
                  <SelectItem value="social_media">Redes Sociais</SelectItem>
                  <SelectItem value="cold_call">Prospeção</SelectItem>
                  <SelectItem value="event">Evento</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Preferência de Localização</Label>
            <Input
              id="location"
              value={formData.location_preference}
              onChange={(e) => setFormData({ ...formData, location_preference: e.target.value })}
              placeholder="Ex: Lisboa, Centro"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Observações importantes..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "A guardar..." : initialData ? "Atualizar" : "Criar Lead"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}