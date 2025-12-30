import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Phone, Mail, MessageSquare, Calendar, FileText, User } from "lucide-react";
import { getInteractions, addInteraction, getLeads } from "@/lib/storage";
import { Interaction, InteractionType, Lead } from "@/types";

export default function Interactions() {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterLeadId, setFilterLeadId] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    leadId: "",
    type: "call" as InteractionType,
    notes: "",
    outcome: "",
    nextAction: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setInteractions(getInteractions());
    setLeads(getLeads());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newInteraction: Interaction = {
      id: Date.now().toString(),
      ...formData,
      timestamp: new Date().toISOString(),
    };
    addInteraction(newInteraction);

    resetForm();
    loadData();
    setIsDialogOpen(false);
  };

  const resetForm = () => {
    setFormData({
      leadId: "",
      type: "call",
      notes: "",
      outcome: "",
      nextAction: "",
    });
  };

  const filteredInteractions = interactions.filter((interaction) => {
    const lead = leads.find((l) => l.id === interaction.leadId);
    const matchesSearch = lead
      ? lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        interaction.notes.toLowerCase().includes(searchTerm.toLowerCase())
      : false;
    const matchesType = filterType === "all" || interaction.type === filterType;
    const matchesLead = filterLeadId === "all" || interaction.leadId === filterLeadId;
    return matchesSearch && matchesType && matchesLead;
  });

  const getInteractionIcon = (type: InteractionType) => {
    switch (type) {
      case "call":
        return Phone;
      case "email":
        return Mail;
      case "whatsapp":
        return MessageSquare;
      case "meeting":
        return Calendar;
      case "note":
        return FileText;
      default:
        return FileText;
    }
  };

  const getInteractionColor = (type: InteractionType) => {
    switch (type) {
      case "call":
        return "bg-blue-100 text-blue-700";
      case "email":
        return "bg-purple-100 text-purple-700";
      case "whatsapp":
        return "bg-emerald-100 text-emerald-700";
      case "meeting":
        return "bg-orange-100 text-orange-700";
      case "note":
        return "bg-slate-100 text-slate-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <Layout title="Interações">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Histórico de Interações
            </h1>
            <p className="text-slate-600">Timeline completo de atividades com leads</p>
          </div>
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Plus className="h-4 w-4 mr-2" />
                Nova Interação
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Registrar Nova Interação</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="leadId">Lead *</Label>
                    <Select value={formData.leadId} onValueChange={(value) => setFormData({ ...formData, leadId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um lead" />
                      </SelectTrigger>
                      <SelectContent>
                        {leads.map((lead) => (
                          <SelectItem key={lead.id} value={lead.id}>
                            {lead.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="type">Tipo de Interação *</Label>
                    <Select value={formData.type} onValueChange={(value: InteractionType) => setFormData({ ...formData, type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="call">Ligação</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="meeting">Reunião</SelectItem>
                        <SelectItem value="note">Nota</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="notes">Notas da Interação *</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      required
                      placeholder="Descreva o que foi discutido..."
                      rows={4}
                    />
                  </div>

                  <div>
                    <Label htmlFor="outcome">Resultado</Label>
                    <Input
                      id="outcome"
                      value={formData.outcome}
                      onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                      placeholder="Ex: Interessado, Não atende, etc."
                    />
                  </div>

                  <div>
                    <Label htmlFor="nextAction">Próxima Ação</Label>
                    <Input
                      id="nextAction"
                      value={formData.nextAction}
                      onChange={(e) => setFormData({ ...formData, nextAction: e.target.value })}
                      placeholder="Ex: Agendar visita"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-gradient-to-r from-blue-600 to-purple-600">
                    Registrar Interação
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="border-0 shadow-lg mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar interações..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de Interação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Tipos</SelectItem>
                  <SelectItem value="call">Ligação</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="meeting">Reunião</SelectItem>
                  <SelectItem value="note">Nota</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterLeadId} onValueChange={setFilterLeadId}>
                <SelectTrigger>
                  <SelectValue placeholder="Lead" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Leads</SelectItem>
                  {leads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {filteredInteractions.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="text-center py-12">
                <User className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg">Nenhuma interação registrada</p>
                <p className="text-slate-400 text-sm mt-2">Adicione sua primeira interação para começar</p>
              </CardContent>
            </Card>
          ) : (
            filteredInteractions
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .map((interaction) => {
                const lead = leads.find((l) => l.id === interaction.leadId);
                const Icon = getInteractionIcon(interaction.type);

                return (
                  <Card key={interaction.id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl ${getInteractionColor(interaction.type)}`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-bold text-lg text-slate-900">{lead?.name || "Lead não encontrado"}</h3>
                              <p className="text-sm text-slate-500">
                                {new Date(interaction.timestamp).toLocaleString("pt-BR")}
                              </p>
                            </div>
                            <Badge className={`${getInteractionColor(interaction.type)} hover:${getInteractionColor(interaction.type)}`}>
                              {interaction.type === "call" ? "Ligação" :
                               interaction.type === "email" ? "Email" :
                               interaction.type === "whatsapp" ? "WhatsApp" :
                               interaction.type === "meeting" ? "Reunião" : "Nota"}
                            </Badge>
                          </div>
                          <p className="text-slate-700 mb-3">{interaction.notes}</p>
                          {interaction.outcome && (
                            <div className="mb-2">
                              <span className="text-sm font-semibold text-slate-600">Resultado: </span>
                              <span className="text-sm text-slate-700">{interaction.outcome}</span>
                            </div>
                          )}
                          {interaction.nextAction && (
                            <div>
                              <span className="text-sm font-semibold text-slate-600">Próxima Ação: </span>
                              <span className="text-sm text-slate-700">{interaction.nextAction}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
          )}
        </div>
      </div>
    </Layout>
  );
}