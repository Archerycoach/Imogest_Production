import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Phone, 
  Mail, 
  Edit, 
  Trash2, 
  User, 
  Download, 
  Upload
} from "lucide-react";
import { 
  getLeads, 
  createLead, 
  updateLead, 
  deleteLead,
  getLeadStats 
} from "@/services/leadsService";
import { importLeadsFromExcel, generateLeadsTemplate } from "@/services/importService";
import { supabase } from "@/integrations/supabase/client";
import { Lead } from "@/types";

export default function LeadsPage() {
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  
  // Filters
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [formState, setFormState] = useState({
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
    loadLeads();
  }, []);

  const loadLeads = async () => {
    try {
      setLoading(true);
      const data = await getLeads();
      setLeads(data as unknown as Lead[]); // Double cast to force it
    } catch (error) {
      console.error("Error loading leads:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os leads.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newLead = {
        name: formState.name,
        email: formState.email,
        phone: formState.phone,
        status: formState.status as any,
        lead_type: formState.lead_type as any,
        notes: formState.notes,
        budget: formState.budget ? Number(formState.budget) : null,
        location_preference: formState.location_preference,
        source: formState.source as any,
        user_id: user.id
      };

      await createLead(newLead);
      
      toast({
        title: "Sucesso",
        description: "Lead criado com sucesso.",
      });
      
      setIsCreateDialogOpen(false);
      resetForm();
      loadLeads();
    } catch (error) {
      console.error("Error creating lead:", error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o lead.",
        variant: "destructive",
      });
    }
  };

  const handleUpdate = async () => {
    if (!selectedLead) return;

    try {
      const updates = {
        name: formState.name,
        email: formState.email,
        phone: formState.phone,
        status: formState.status as any,
        lead_type: formState.lead_type as any,
        notes: formState.notes,
        budget: formState.budget ? Number(formState.budget) : null,
        location_preference: formState.location_preference,
        source: formState.source
      };

      await updateLead(selectedLead.id, updates);

      toast({
        title: "Sucesso",
        description: "Lead atualizado com sucesso.",
      });

      setIsEditDialogOpen(false);
      setSelectedLead(null);
      resetForm();
      loadLeads();
    } catch (error) {
      console.error("Error updating lead:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o lead.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem a certeza que deseja eliminar este lead?")) return;

    try {
      await deleteLead(id);
      toast({
        title: "Sucesso",
        description: "Lead eliminado com sucesso.",
      });
      loadLeads();
    } catch (error) {
      console.error("Error deleting lead:", error);
      toast({
        title: "Erro",
        description: "Não foi possível eliminar o lead.",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (lead: Lead) => {
    setSelectedLead(lead);
    setFormState({
      name: lead.name,
      email: lead.email || "",
      phone: lead.phone || "",
      status: lead.status || "new",
      lead_type: lead.lead_type || "buyer",
      notes: lead.notes || "",
      budget: lead.budget ? lead.budget.toString() : "",
      location_preference: lead.location_preference || "",
      source: lead.source || ""
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormState({
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
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "bg-blue-100 text-blue-800";
      case "contacted": return "bg-yellow-100 text-yellow-800";
      case "qualified": return "bg-purple-100 text-purple-800";
      case "proposal": return "bg-indigo-100 text-indigo-800";
      case "negotiation": return "bg-orange-100 text-orange-800";
      case "won": return "bg-green-100 text-green-800";
      case "lost": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "new": return "Novo";
      case "contacted": return "Contactado";
      case "qualified": return "Qualificado";
      case "proposal": return "Proposta";
      case "negotiation": return "Negociação";
      case "won": return "Ganho";
      case "lost": return "Perdido";
      default: return status;
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === "all" || lead.lead_type === filterType;
    const matchesStatus = filterStatus === "all" || lead.status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Handle file upload
    const fileList = e.target.files;
    const files = fileList ? Array.from(fileList) : [];
    
    if (files.length > 0) {
      // Logic for file upload
      console.log("Files to upload:", files);
      // Implement your upload logic here
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
            <p className="text-muted-foreground">
              Gerir os seus potenciais clientes
            </p>
          </div>
          <div className="flex gap-2">
             <Button variant="outline" onClick={generateLeadsTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Template
            </Button>
            <div className="relative">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Importar
              </Button>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Lead
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Criar Novo Lead</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome *</Label>
                      <Input 
                        id="name" 
                        value={formState.name} 
                        onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                        placeholder="Nome do cliente"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone</Label>
                      <Input 
                        id="phone" 
                        value={formState.phone} 
                        onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                        placeholder="+351..."
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email"
                      value={formState.email} 
                      onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="source">Origem</Label>
                    <Select 
                      value={formState.source} 
                      onValueChange={(value) => setFormState({ ...formState, source: value })}
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

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="status">Estado</Label>
                      <Select 
                        value={formState.status} 
                        onValueChange={(value) => setFormState({ ...formState, status: value })}
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
                    <div className="space-y-2">
                      <Label htmlFor="type">Tipo</Label>
                      <Select 
                        value={formState.lead_type} 
                        onValueChange={(value) => setFormState({ ...formState, lead_type: value })}
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
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="budget">Orçamento (€)</Label>
                      <Input 
                        id="budget" 
                        type="number"
                        value={formState.budget} 
                        onChange={(e) => setFormState({ ...formState, budget: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Preferência Localização</Label>
                      <Input 
                        id="location" 
                        value={formState.location_preference} 
                        onChange={(e) => setFormState({ ...formState, location_preference: e.target.value })}
                        placeholder="Ex: Lisboa, Centro"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notas</Label>
                    <Textarea 
                      id="notes" 
                      value={formState.notes} 
                      onChange={(e) => setFormState({ ...formState, notes: e.target.value })}
                      placeholder="Observações importantes..."
                    />
                  </div>
                  <Button onClick={handleCreate} className="w-full mt-2">Criar Lead</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar leads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <div className="flex gap-2">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Estados</SelectItem>
                    <SelectItem value="new">Novo</SelectItem>
                    <SelectItem value="contacted">Contactado</SelectItem>
                    <SelectItem value="qualified">Qualificado</SelectItem>
                    <SelectItem value="proposal">Proposta</SelectItem>
                    <SelectItem value="negotiation">Negociação</SelectItem>
                    <SelectItem value="won">Ganho</SelectItem>
                    <SelectItem value="lost">Perdido</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Tipos</SelectItem>
                    <SelectItem value="buyer">Comprador</SelectItem>
                    <SelectItem value="seller">Vendedor</SelectItem>
                    <SelectItem value="both">Ambos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Orçamento</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        A carregar...
                      </TableCell>
                    </TableRow>
                  ) : filteredLeads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        Nenhum lead encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLeads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            {lead.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col text-sm">
                            <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {lead.phone || "-"}</span>
                            <span className="flex items-center gap-1 text-gray-500"><Mail className="h-3 w-3" /> {lead.email || "-"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {lead.lead_type === "buyer" ? "Comprador" : lead.lead_type === "seller" ? "Vendedor" : "Ambos"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(lead.status)}>
                            {getStatusLabel(lead.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {lead.budget ? `${lead.budget.toLocaleString()} €` : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(lead)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(lead.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Editar Lead</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Nome *</Label>
                  <Input 
                    id="edit-name" 
                    value={formState.name} 
                    onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Telefone</Label>
                  <Input 
                    id="edit-phone" 
                    value={formState.phone} 
                    onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input 
                  id="edit-email" 
                  type="email"
                  value={formState.email} 
                  onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-source">Origem</Label>
                <Select 
                  value={formState.source} 
                  onValueChange={(value) => setFormState({ ...formState, source: value })}
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-status">Estado</Label>
                  <Select 
                    value={formState.status} 
                    onValueChange={(value) => setFormState({ ...formState, status: value })}
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
                <div className="space-y-2">
                  <Label htmlFor="edit-type">Tipo</Label>
                  <Select 
                    value={formState.lead_type} 
                    onValueChange={(value) => setFormState({ ...formState, lead_type: value })}
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
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-budget">Orçamento (€)</Label>
                  <Input 
                    id="edit-budget" 
                    type="number"
                    value={formState.budget} 
                    onChange={(e) => setFormState({ ...formState, budget: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-location">Preferência Localização</Label>
                  <Input 
                    id="edit-location" 
                    value={formState.location_preference} 
                    onChange={(e) => setFormState({ ...formState, location_preference: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notas</Label>
                <Textarea 
                  id="edit-notes" 
                  value={formState.notes} 
                  onChange={(e) => setFormState({ ...formState, notes: e.target.value })}
                />
              </div>
              <Button onClick={handleUpdate} className="w-full mt-2">Guardar Alterações</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}