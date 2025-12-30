import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, Plus, Clock, MapPin, Users, Trash2, Edit, ExternalLink, ArrowLeft, Download, Upload, Gift } from "lucide-react";
import { getEvents, addEvent, updateEvent, deleteEvent, getLeads, getProperties } from "@/lib/storage";
import { CalendarEvent, Lead, Property } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { SubscriptionGuard } from "@/components/SubscriptionGuard";
import { 
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  syncEventToGoogle,
  updateGoogleEvent,
  deleteGoogleEvent,
  importGoogleCalendarEvents,
  getGoogleCredentials,
  syncBirthdayAlerts
} from "@/services/calendarService";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";

export default function Calendar() {
  const router = useRouter();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    leadId: "",
    propertyId: "",
    location: "",
    attendees: "",
  });
  // Get user
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    loadData();
    checkGoogleConnection();
  }, []);

  const checkGoogleConnection = async () => {
    try {
      const credentials = await getGoogleCredentials();
      setGoogleConnected(!!credentials?.google_calendar_connected);
    } catch (error) {
      console.error("Error checking Google connection:", error);
    }
  };

  // Helper to convert DB event to Frontend event
  const mapDbEventToFrontend = (dbEvent: any): CalendarEvent => ({
    id: dbEvent.id,
    title: dbEvent.title,
    description: dbEvent.description || "",
    startTime: dbEvent.start_time,
    endTime: dbEvent.end_time,
    location: dbEvent.location || "",
    attendees: Array.isArray(dbEvent.attendees) ? (dbEvent.attendees as string[]) : [],
    leadId: dbEvent.lead_id || undefined,
    propertyId: dbEvent.property_id || undefined,
    googleEventId: dbEvent.google_event_id || undefined,
    googleSynced: dbEvent.google_synced || false,
    eventType: dbEvent.event_type || "meeting",
    createdAt: dbEvent.created_at,
    userId: dbEvent.created_by
  });

  const loadData = async () => {
    setEvents(getEvents());
    setLeads(getLeads());
    setProperties(getProperties());
    
    // Load events from database
    try {
      const dbEvents = await getCalendarEvents();
      // Map DB events to Frontend format
      const mappedDbEvents = dbEvents.map(mapDbEventToFrontend);
      
      // Merge with localStorage events (filtering out duplicates if needed, but for now simple merge)
      // In a real app we might want to prioritize DB events
      const mergedEvents = [...getEvents(), ...mappedDbEvents];
      
      // Remove duplicates by ID if any
      const uniqueEvents = Array.from(new Map(mergedEvents.map(item => [item.id, item])).values());
      
      setEvents(uniqueEvents);
    } catch (error) {
      console.error("Error loading events:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingEvent) {
        // Update existing event
        const { data: updatedEvent, error } = await updateCalendarEvent(editingEvent.id, {
          title: formData.title,
          description: formData.description,
          start_time: formData.startTime,
          end_time: formData.endTime,
          location: formData.location || null,
          attendees: formData.attendees.split(",").map((a) => a.trim()).filter(a => a),
          lead_id: formData.leadId || null,
          property_id: formData.propertyId || null,
        });
        
        if (error) throw error;

        if (updatedEvent) {
          setEvents(events.map((e) => (e.id === updatedEvent.id ? updatedEvent : e)));
        }

        // Sync to Google Calendar if connected
        if (googleConnected && editingEvent.googleEventId) {
          await updateGoogleEvent(editingEvent.googleEventId, updatedEvent);
          toast({
            title: "Evento atualizado",
            description: "Evento atualizado no CRM e Google Calendar",
          });
        } else if (googleConnected) {
          // Create in Google if not synced yet
          const googleEventId = await syncEventToGoogle(updatedEvent);
          if (googleEventId) {
            await updateCalendarEvent(updatedEvent.id, { 
              google_event_id: googleEventId,
              google_synced: true 
            } as any);
          }
          toast({
            title: "Evento atualizado e sincronizado",
            description: "Evento agora está sincronizado com Google Calendar",
          });
        }
      } else {
        // Create new event
        if (!user) return;
        
        const newEventPayload = {
          user_id: user.id,
          title: formData.title,
          description: formData.description,
          start_time: new Date(`${formData.startTime}`).toISOString(),
          end_time: new Date(`${formData.endTime}`).toISOString(),
          location: formData.location,
          event_type: "meeting",
          attendees: formData.attendees.split(",").map(e => e.trim()).filter(Boolean),
          lead_id: formData.leadId || null,
          property_id: formData.propertyId || null,
        };

        const createdEvent = await createCalendarEvent(newEventPayload as any);

        // Sync to Google Calendar if connected
        if (googleConnected) {
          const googleEventId = await syncEventToGoogle(createdEvent as any);
          if (googleEventId) {
            await updateCalendarEvent(createdEvent.id, { 
              google_event_id: googleEventId
            } as any);
            toast({
              title: "Evento criado e sincronizado",
              description: "Evento criado no CRM e Google Calendar",
            });
          }
        } else {
          toast({
            title: "Evento criado",
            description: "Evento criado com sucesso",
          });
        }
      }

      resetForm();
      await loadData();
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error saving event:", error);
      toast({
        title: "Erro",
        description: "Erro ao guardar evento",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (event: CalendarEvent) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description,
      startTime: event.startTime,
      endTime: event.endTime,
      leadId: event.leadId || "",
      propertyId: event.propertyId || "",
      location: event.location || "",
      attendees: event.attendees.join(", "),
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem a certeza que deseja eliminar este evento?")) {
      try {
        const event = events.find(e => e.id === id);
        
        // Delete from Google Calendar if synced
        if (googleConnected && event?.googleEventId) {
          await deleteGoogleEvent(event.googleEventId);
        }

        await deleteCalendarEvent(id);
        await loadData();
        
        toast({
          title: "Evento eliminado",
          description: googleConnected 
            ? "Evento eliminado do CRM e Google Calendar"
            : "Evento eliminado com sucesso",
        });
      } catch (error) {
        console.error("Error deleting event:", error);
        toast({
          title: "Erro",
          description: "Erro ao eliminar evento",
          variant: "destructive",
        });
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      startTime: "",
      endTime: "",
      leadId: "",
      propertyId: "",
      location: "",
      attendees: "",
    });
    setEditingEvent(null);
  };

  const handleImportFromGoogle = async () => {
    if (!googleConnected) {
      toast({
        title: "Google Calendar não conectado",
        description: "Por favor conecte o Google Calendar primeiro",
        variant: "destructive",
      });
      return;
    }

    setSyncLoading(true);
    try {
      const importedEvents = await importGoogleCalendarEvents();
      await loadData();
      
      toast({
        title: "Importação concluída",
        description: `${importedEvents.length} eventos importados do Google Calendar`,
      });
    } catch (error) {
      console.error("Error importing from Google:", error);
      toast({
        title: "Erro na importação",
        description: "Erro ao importar eventos do Google Calendar",
        variant: "destructive",
      });
    } finally {
      setSyncLoading(false);
    }
  };

  const handleSyncBirthdayAlerts = async () => {
    setSyncLoading(true);
    try {
      const count = await syncBirthdayAlerts();
      await loadData();
      
      toast({
        title: "Alertas de aniversário criados",
        description: `${count} alertas de aniversário adicionados ao calendário`,
      });
    } catch (error) {
      console.error("Error syncing birthday alerts:", error);
      toast({
        title: "Erro",
        description: "Erro ao criar alertas de aniversário",
        variant: "destructive",
      });
    } finally {
      setSyncLoading(false);
    }
  };

  const syncWithGoogleCalendar = () => {
    window.open("https://calendar.google.com/calendar/u/0/r/settings/export", "_blank");
  };

  const filteredEvents = events.filter((event) => {
    const eventDate = new Date(event.startTime).toISOString().split("T")[0];
    return eventDate === selectedDate;
  });

  const upcomingEvents = events
    .filter((event) => new Date(event.startTime) >= new Date())
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 5);

  return (
    <SubscriptionGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto p-6 space-y-6">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex items-center gap-4 mb-8">
              <Button variant="outline" onClick={() => router.push("/dashboard")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar ao Painel
              </Button>
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-slate-900 mb-2">Agenda</h1>
                <p className="text-slate-600">Gerir compromissos e reuniões</p>
              </div>
              <div className="flex gap-3">
                {googleConnected && (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={handleImportFromGoogle}
                      disabled={syncLoading}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {syncLoading ? "A importar..." : "Importar do Google"}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleSyncBirthdayAlerts}
                      disabled={syncLoading}
                    >
                      <Gift className="h-4 w-4 mr-2" />
                      Alertas Aniversário
                    </Button>
                  </>
                )}
                <Button variant="outline" onClick={syncWithGoogleCalendar}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {googleConnected ? "Ver no Google" : "Conectar Google"}
                </Button>
                <Dialog
                  open={isDialogOpen}
                  onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) resetForm();
                  }}
                >
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Evento
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{editingEvent ? "Editar Evento" : "Novo Evento"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <Label htmlFor="title">Título *</Label>
                          <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            required
                          />
                        </div>

                        <div>
                          <Label htmlFor="startTime">Data/Hora Início *</Label>
                          <Input
                            id="startTime"
                            type="datetime-local"
                            value={formData.startTime}
                            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                            required
                          />
                        </div>

                        <div>
                          <Label htmlFor="endTime">Data/Hora Fim *</Label>
                          <Input
                            id="endTime"
                            type="datetime-local"
                            value={formData.endTime}
                            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                            required
                          />
                        </div>

                        <div>
                          <Label htmlFor="leadId">Lead Relacionado</Label>
                          <Select value={formData.leadId} onValueChange={(value) => setFormData({ ...formData, leadId: value === "none" ? "" : value })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecionar lead" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Nenhum</SelectItem>
                              {leads.map((lead) => (
                                <SelectItem key={lead.id} value={lead.id}>
                                  {lead.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="propertyId">Imóvel Relacionado</Label>
                          <Select value={formData.propertyId} onValueChange={(value) => setFormData({ ...formData, propertyId: value === "none" ? "" : value })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecionar imóvel" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Nenhum</SelectItem>
                              {properties.map((property) => (
                                <SelectItem key={property.id} value={property.id}>
                                  {property.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="col-span-2">
                          <Label htmlFor="location">Local</Label>
                          <Input
                            id="location"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            placeholder="Morada ou link da reunião"
                          />
                        </div>

                        <div className="col-span-2">
                          <Label htmlFor="attendees">Participantes (separados por vírgula)</Label>
                          <Input
                            id="attendees"
                            value={formData.attendees}
                            onChange={(e) => setFormData({ ...formData, attendees: e.target.value })}
                            placeholder="nome1@email.com, nome2@email.com"
                          />
                        </div>

                        <div className="col-span-2">
                          <Label htmlFor="description">Descrição</Label>
                          <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Detalhes do evento..."
                            rows={3}
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end">
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit" className="bg-gradient-to-r from-blue-600 to-purple-600">
                          {editingEvent ? "Atualizar" : "Criar Evento"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card className="border-0 shadow-lg mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Selecionar Data</span>
                      <CalendarIcon className="h-5 w-5 text-slate-600" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full"
                    />
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle>
                      Eventos do Dia ({new Date(selectedDate).toLocaleDateString("pt-PT")})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {filteredEvents.length === 0 ? (
                        <p className="text-slate-500 text-center py-8">Nenhum evento para esta data</p>
                      ) : (
                        filteredEvents.map((event) => {
                          const lead = leads.find((l) => l.id === event.leadId);
                          const property = properties.find((p) => p.id === event.propertyId);

                          return (
                            <div key={event.id} className="p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-semibold text-slate-900">{event.title}</h4>
                                <div className="flex gap-2">
                                  <Button size="sm" variant="ghost" onClick={() => handleEdit(event)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => handleDelete(event.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              <div className="space-y-2 text-sm text-slate-600">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  <span>
                                    {new Date(event.startTime).toLocaleTimeString("pt-PT", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}{" "}
                                    -{" "}
                                    {new Date(event.endTime).toLocaleTimeString("pt-PT", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                                {event.location && (
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    <span>{event.location}</span>
                                  </div>
                                )}
                                {event.attendees.length > 0 && (
                                  <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    <span>{event.attendees.join(", ")}</span>
                                  </div>
                                )}
                                {lead && (
                                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                                    Lead: {lead.name}
                                  </Badge>
                                )}
                                {property && (
                                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                    Imóvel: {property.title}
                                  </Badge>
                                )}
                              </div>
                              {event.description && (
                                <p className="mt-2 text-sm text-slate-600">{event.description}</p>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle>Próximos Eventos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {upcomingEvents.length === 0 ? (
                        <p className="text-slate-500 text-center py-8">Nenhum evento próximo</p>
                      ) : (
                        upcomingEvents.map((event) => (
                          <div key={event.id} className="p-3 bg-slate-50 rounded-lg">
                            <h5 className="font-semibold text-sm text-slate-900 mb-1">{event.title}</h5>
                            <div className="text-xs text-slate-600 space-y-1">
                              <div>
                                {new Date(event.startTime).toLocaleDateString("pt-PT")}
                              </div>
                              <div>
                                {new Date(event.startTime).toLocaleTimeString("pt-PT", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SubscriptionGuard>
  );
}