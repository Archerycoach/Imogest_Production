import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Search,
  Plus,
  Mail,
  Phone,
  Edit,
  Trash2,
  Calendar,
  Gift,
  MessageSquare,
  MessageCircle,
} from "lucide-react";
import {
  getContacts,
  searchContacts,
  createContact,
  updateContact,
  deleteContact,
  getUpcomingBirthdays,
  configureAutoMessages,
} from "@/services/contactsService";
import { useToast } from "@/hooks/use-toast";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [autoMessageDialogOpen, setAutoMessageDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    birth_date: "",
    notes: "",
  });
  const [autoMessageConfig, setAutoMessageConfig] = useState({
    birthday_enabled: false,
    custom_dates: [] as Array<{ date: string; message: string; enabled: boolean }>,
  });
  const { toast } = useToast();

  useEffect(() => {
    loadContacts();
    loadUpcomingBirthdays();
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const data = await getContacts();
      setContacts(data);
    } catch (error) {
      console.error("Error loading contacts:", error);
      toast({
        title: "Erro ao carregar contactos",
        description: "Ocorreu um erro ao carregar os contactos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUpcomingBirthdays = async () => {
    try {
      const data = await getUpcomingBirthdays();
      setUpcomingBirthdays(data);
    } catch (error) {
      console.error("Error loading birthdays:", error);
    }
  };

  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    if (term.length > 2) {
      const results = await searchContacts(term);
      setContacts(results);
    } else if (term.length === 0) {
      loadContacts();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingContact) {
        await updateContact(editingContact.id, formData as any);
        toast({
          title: "Contacto atualizado!",
          description: "O contacto foi atualizado com sucesso.",
        });
      } else {
        await createContact(formData as any);
        toast({
          title: "Contacto criado!",
          description: "O contacto foi criado com sucesso.",
        });
      }
      setDialogOpen(false);
      resetForm();
      loadContacts();
      loadUpcomingBirthdays();
    } catch (error: any) {
      console.error("Error saving contact:", error);
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao guardar o contacto.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja eliminar este contacto?")) return;

    try {
      await deleteContact(id);
      toast({
        title: "Contacto eliminado",
        description: "O contacto foi eliminado com sucesso.",
      });
      loadContacts();
      loadUpcomingBirthdays();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao eliminar o contacto.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (contact: any) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name || "",
      email: contact.email || "",
      phone: contact.phone || "",
      birth_date: contact.birth_date || "",
      notes: contact.notes || "",
    });
    setDialogOpen(true);
  };

  const handleConfigureAutoMessages = (contact: any) => {
    setEditingContact(contact);
    // Ensure safe defaults for auto_message_config
    const config = contact.auto_message_config || {};
    setAutoMessageConfig({
      birthday_enabled: config.birthday_enabled || false,
      custom_dates: Array.isArray(config.custom_dates) ? config.custom_dates : [],
    });
    setAutoMessageDialogOpen(true);
  };

  const handleSaveAutoMessages = async () => {
    try {
      await configureAutoMessages(editingContact.id, autoMessageConfig);
      toast({
        title: "Configuração guardada!",
        description: "As mensagens automáticas foram configuradas.",
      });
      setAutoMessageDialogOpen(false);
      loadContacts();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao guardar a configuração.",
        variant: "destructive",
      });
    }
  };

  const addCustomDate = () => {
    setAutoMessageConfig({
      ...autoMessageConfig,
      custom_dates: [
        ...autoMessageConfig.custom_dates,
        { date: "", message: "", enabled: true },
      ],
    });
  };

  const removeCustomDate = (index: number) => {
    setAutoMessageConfig({
      ...autoMessageConfig,
      custom_dates: autoMessageConfig.custom_dates.filter((_, i) => i !== index),
    });
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      birth_date: "",
      notes: "",
    });
    setEditingContact(null);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("pt-PT", {
      day: "2-digit",
      month: "2-digit",
    }).format(date);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Contactos</h1>
            <p className="text-muted-foreground">
              Gerir contactos e automatizar mensagens
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Contacto
          </Button>
        </div>

        {upcomingBirthdays.length > 0 && (
          <Card className="border-l-4 border-l-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                Aniversários Próximos (30 dias)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {upcomingBirthdays.map((contact) => (
                  <Badge key={contact.id} variant="secondary" className="text-sm">
                    {contact.name} - {formatDate(contact.birth_date)}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar contactos..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Aniversário</TableHead>
                    <TableHead>Automação</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhum contacto encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    contacts.map((contact) => (
                      <TableRow key={contact.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {contact.name?.charAt(0) || "?"}
                              </AvatarFallback>
                            </Avatar>
                            {contact.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col text-sm space-y-1">
                            {contact.phone && (
                              <span className="flex items-center gap-1 text-gray-600">
                                <Phone className="h-3 w-3" /> {contact.phone}
                              </span>
                            )}
                            {contact.email && (
                              <span className="flex items-center gap-1 text-gray-500">
                                <Mail className="h-3 w-3" /> {contact.email}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {contact.birth_date ? (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(contact.birth_date)}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {contact.auto_message_config?.birthday_enabled && (
                            <Badge variant="secondary" className="text-xs">
                              <Gift className="h-3 w-3 mr-1" />
                              Aniversário
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (!contact.email) {
                                  toast({
                                    title: "Sem email",
                                    description: "Este contacto não tem email.",
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                window.location.href = `mailto:${contact.email}`;
                              }}
                              className="hover:bg-purple-50 text-purple-600"
                              title="Enviar Email"
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (!contact.phone) {
                                  toast({
                                    title: "Sem telefone",
                                    description: "Este contacto não tem telefone.",
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                const cleanPhone = contact.phone.replace(/\D/g, "");
                                const phoneWithCountry = cleanPhone.startsWith("351") ? cleanPhone : `351${cleanPhone}`;
                                window.location.href = `sms:+${phoneWithCountry}`;
                              }}
                              className="hover:bg-orange-50 text-orange-600"
                              title="Enviar SMS"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (!contact.phone) {
                                  toast({
                                    title: "Sem telefone",
                                    description: "Este contacto não tem telefone.",
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                const cleanPhone = contact.phone.replace(/\D/g, "");
                                const phoneWithCountry = cleanPhone.startsWith("351") ? cleanPhone : `351${cleanPhone}`;
                                window.open(`https://wa.me/${phoneWithCountry}`, "_blank");
                              }}
                              className="hover:bg-green-50 text-green-600"
                              title="WhatsApp"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleConfigureAutoMessages(contact)}
                              className="hover:bg-blue-50"
                              title="Configurar Mensagens Automáticas"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(contact)}
                              className="hover:bg-gray-100"
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(contact.id)}
                              className="hover:bg-red-50 text-red-500"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Contact Form Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingContact ? "Editar Contacto" : "Novo Contacto"}
              </DialogTitle>
              <DialogDescription>
                Preencha os dados do contacto.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="birth_date">Data de Nascimento</Label>
                <Input
                  id="birth_date"
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingContact ? "Atualizar" : "Criar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Auto Messages Configuration Dialog */}
        <Dialog open={autoMessageDialogOpen} onOpenChange={setAutoMessageDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Configurar Mensagens Automáticas</DialogTitle>
              <DialogDescription>
                Configure mensagens automáticas para datas especiais.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Mensagem de Aniversário</Label>
                  <p className="text-sm text-muted-foreground">
                    Enviar mensagem automática no dia de aniversário
                  </p>
                </div>
                <Switch
                  checked={autoMessageConfig.birthday_enabled}
                  onCheckedChange={(checked) =>
                    setAutoMessageConfig({ ...autoMessageConfig, birthday_enabled: checked })
                  }
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Datas Personalizadas</Label>
                  <Button type="button" size="sm" onClick={addCustomDate}>
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar Data
                  </Button>
                </div>
                {autoMessageConfig.custom_dates && autoMessageConfig.custom_dates.length > 0 ? (
                  autoMessageConfig.custom_dates.map((customDate, index) => (
                    <Card key={index} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Switch
                            checked={customDate.enabled}
                            onCheckedChange={(checked) => {
                              const newDates = [...autoMessageConfig.custom_dates];
                              newDates[index].enabled = checked;
                              setAutoMessageConfig({ ...autoMessageConfig, custom_dates: newDates });
                            }}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCustomDate(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <Input
                          type="date"
                          value={customDate.date}
                          onChange={(e) => {
                            const newDates = [...autoMessageConfig.custom_dates];
                            newDates[index].date = e.target.value;
                            setAutoMessageConfig({ ...autoMessageConfig, custom_dates: newDates });
                          }}
                        />
                        <Textarea
                          placeholder="Mensagem..."
                          value={customDate.message}
                          onChange={(e) => {
                            const newDates = [...autoMessageConfig.custom_dates];
                            newDates[index].message = e.target.value;
                            setAutoMessageConfig({ ...autoMessageConfig, custom_dates: newDates });
                          }}
                          rows={2}
                        />
                      </div>
                    </Card>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma data personalizada configurada. Clique em "Adicionar Data" para começar.
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAutoMessageDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleSaveAutoMessages}>
                Guardar Configuração
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}