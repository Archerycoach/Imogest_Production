import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getCalendarEvents, createCalendarEvent, deleteCalendarEvent, updateCalendarEvent } from "@/services/calendarService";
import { getLeads } from "@/services/leadsService";
import { getProperties } from "@/services/propertiesService";
import { getAllTasks, updateTask, deleteTask } from "@/services/tasksService";
import { getGoogleCredentials } from "@/services/googleCalendarService";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Clock, ChevronLeft, ChevronRight, RefreshCw, Calendar as CalendarIcon, Link } from "lucide-react";
import { GoogleCalendarConnect } from "@/components/GoogleCalendarConnect";
import type { Lead, Property } from "@/types";

type ViewMode = "day" | "week" | "month";

export default function Calendar() {
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draggedItem, setDraggedItem] = useState<{ id: string; type: "event" | "task"; startTime: string } | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showGoogleConnect, setShowGoogleConnect] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [googleConfigured, setGoogleConfigured] = useState(false);
  const [editingTask, setEditingTask] = useState({
    id: "",
    title: "",
    description: "",
    status: "pending",
    priority: "medium",
    due_date: "",
  });
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    event_type: "meeting" as const,
    start_time: "",
    end_time: "",
    lead_id: "none",
    property_id: "none",
  });

  useEffect(() => {
    checkAuth();
    checkGoogleConfiguration();
    checkGoogleConnection();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/login");
      return;
    }
    loadData();
  };

  const checkGoogleConfiguration = () => {
    // Check if Google OAuth is configured
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const configured = !!(clientId && clientId !== "your_client_id_here.apps.googleusercontent.com");
    setGoogleConfigured(configured);
  };

  const checkGoogleConnection = async () => {
    try {
      const credentials = await getGoogleCredentials();
      setGoogleConnected(!!credentials);
    } catch (error) {
      setGoogleConnected(false);
    }
  };

  const handleGoogleConnect = () => {
    if (!googleConfigured) {
      alert("⚠️ Configuração Google Calendar Necessária\n\nAs credenciais OAuth do Google não estão configuradas.\n\nPor favor, siga o guia rápido em GOOGLE_CALENDAR_QUICK_SETUP.md para configurar a integração.");
      return;
    }
    setShowGoogleConnect(true);
  };

  const syncWithGoogleCalendar = async () => {
    if (!googleConnected) {
      alert("Por favor conecte sua conta Google Calendar primeiro");
      setShowGoogleConnect(true);
      return;
    }

    try {
      setSyncing(true);
      
      const { performFullSync } = await import("@/services/googleCalendarService");
      const result = await performFullSync();

      if (result.errors.length > 0) {
        console.error("Sync errors:", result.errors);
        alert(`Sincronização parcial:\n✅ ${result.imported} eventos importados\n✅ ${result.exported} eventos exportados\n⚠️ ${result.errors.length} erros`);
      } else {
        alert(`Sincronização concluída!\n✅ ${result.imported} eventos importados do Google Calendar\n✅ ${result.exported} eventos exportados para o Google Calendar`);
      }

      await loadData();
    } catch (error) {
      console.error("Error syncing with Google Calendar:", error);
      alert("Erro ao sincronizar com Google Calendar. Tente novamente.");
    } finally {
      setSyncing(false);
    }
  };

  const exportToGoogleCalendar = async (eventId: string) => {
    if (!googleConnected) {
      alert("Por favor conecte sua conta Google Calendar primeiro");
      setShowGoogleConnect(true);
      return;
    }

    try {
      const { exportEventToGoogle } = await import("@/services/googleCalendarService");
      await exportEventToGoogle(eventId);

      alert("Evento exportado para Google Calendar com sucesso!");
      await loadData();
    } catch (error) {
      console.error("Error exporting to Google Calendar:", error);
      alert("Erro ao exportar para Google Calendar. Tente novamente.");
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [eventsData, leadsData, propertiesData, tasksData] = await Promise.all([
        getCalendarEvents(),
        getLeads(),
        getProperties(),
        getAllTasks(),
      ]);
      
      // Merge tasks into events for calendar display
      const taskEvents = tasksData.map((task: any) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        event_type: "task",
        start_time: task.due_date || task.created_at,
        end_time: task.due_date || task.created_at,
        lead_id: task.lead_id,
        property_id: task.property_id,
        task_status: task.status,
        task_priority: task.priority,
      }));
      
      setEvents([...eventsData, ...taskEvents]);
      setLeads(leadsData as unknown as Lead[]);
      setProperties(propertiesData as unknown as Property[]);
      setTasks(tasksData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.start_time) {
      alert("Por favor preencha os campos obrigatórios (Título e Data/Hora Início)");
      return;
    }

    // Validate dates only if end_time is provided
    if (newEvent.end_time) {
      const startDate = new Date(newEvent.start_time);
      const endDate = new Date(newEvent.end_time);
      
      if (endDate <= startDate) {
        alert("A data de fim deve ser posterior à data de início. Por favor ajuste as datas.");
        return;
      }
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const eventData = {
        title: newEvent.title,
        description: newEvent.description || null,
        event_type: newEvent.event_type,
        start_time: newEvent.start_time,
        end_time: newEvent.end_time || null,
        lead_id: newEvent.lead_id === "none" ? null : newEvent.lead_id,
        property_id: newEvent.property_id === "none" ? null : newEvent.property_id,
        user_id: session.user.id
      };

      if (editingEventId) {
        // Update existing event
        await updateCalendarEvent(editingEventId, eventData);
        
        // Auto-sync update to Google Calendar if connected
        if (googleConnected) {
          const { autoSyncUpdateToGoogle } = await import("@/services/googleCalendarService");
          await autoSyncUpdateToGoogle(editingEventId, eventData);
        }
      } else {
        // Create new event
        const newEventResult = await createCalendarEvent(eventData);
        
        // Auto-sync to Google Calendar if connected
        if (googleConnected && newEventResult) {
          const { autoSyncEventToGoogle } = await import("@/services/googleCalendarService");
          const synced = await autoSyncEventToGoogle(newEventResult.id);
          if (synced) {
            console.log("Event automatically synced to Google Calendar");
          }
        }
      }
      
      handleCancelEdit();
      await loadData();
    } catch (error) {
      console.error("Error saving event:", error);
      alert("Erro ao guardar evento. Tente novamente.");
    }
  };

  const getEventsForView = () => {
    const now = new Date(currentDate);
    
    if (viewMode === "day") {
      const startOfDay = new Date(now.setHours(0, 0, 0, 0));
      const endOfDay = new Date(now.setHours(23, 59, 59, 999));
      
      return events.filter(event => {
        const eventDate = new Date(event.start_time);
        return eventDate >= startOfDay && eventDate <= endOfDay;
      });
    } else if (viewMode === "week") {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      
      return events.filter(event => {
        const eventDate = new Date(event.start_time);
        return eventDate >= startOfWeek && eventDate <= endOfWeek;
      });
    } else {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      
      return events.filter(event => {
        const eventDate = new Date(event.start_time);
        return eventDate >= startOfMonth && eventDate <= endOfMonth;
      });
    }
  };

  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    if (viewMode === "day") {
      newDate.setDate(currentDate.getDate() + (direction === "next" ? 1 : -1));
    } else if (viewMode === "week") {
      newDate.setDate(currentDate.getDate() + (direction === "next" ? 7 : -7));
    } else {
      newDate.setMonth(currentDate.getMonth() + (direction === "next" ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const handleStartTimeChange = (value: string) => {
    setNewEvent({ ...newEvent, start_time: value });
    
    // Auto-adjust end_time to be 1 hour after start_time if end_time is empty
    if (!newEvent.end_time && value) {
      const startDate = new Date(value);
      startDate.setHours(startDate.getHours() + 1);
      const endTimeString = startDate.toISOString().slice(0, 16);
      setNewEvent({ ...newEvent, start_time: value, end_time: endTimeString });
    }
  };

  const handleEventClick = (event: any) => {
    // Don't edit tasks, only calendar events
    if (event.event_type === "task") return;

    setEditingEventId(event.id);
    setNewEvent({
      title: event.title,
      description: event.description || "",
      event_type: event.event_type,
      start_time: event.start_time.slice(0, 16), // Format for datetime-local input
      end_time: event.end_time ? event.end_time.slice(0, 16) : "",
      lead_id: event.lead_id || "none",
      property_id: event.property_id || "none",
    });
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setShowForm(false);
    setEditingEventId(null);
    setNewEvent({
      title: "",
      description: "",
      event_type: "meeting",
      start_time: "",
      end_time: "",
      lead_id: "none",
      property_id: "none",
    });
  };

  const handleDeleteEvent = async () => {
    if (!editingEventId) return;
    
    if (!confirm("Tem a certeza que deseja eliminar este evento?")) return;

    try {
      // Get event data before deleting to check if it has google_event_id
      const { data: eventToDelete } = await supabase
        .from("calendar_events")
        .select("google_event_id")
        .eq("id", editingEventId)
        .single();

      await deleteCalendarEvent(editingEventId);
      
      // Auto-sync delete to Google Calendar if connected and event was synced
      if (googleConnected && eventToDelete?.google_event_id) {
        const { autoSyncDeleteToGoogle } = await import("@/services/googleCalendarService");
        await autoSyncDeleteToGoogle(eventToDelete.google_event_id);
      }
      
      handleCancelEdit();
      await loadData();
    } catch (error) {
      console.error("Error deleting event:", error);
      alert("Erro ao eliminar evento. Tente novamente.");
    }
  };

  const handleDragStart = (e: React.DragEvent, item: { id: string; type: "event" | "task"; startTime: string }) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = "move";
    // Add visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
    setDraggedItem(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    
    if (!draggedItem) return;

    try {
      // Calculate new date while preserving time
      const originalDate = new Date(draggedItem.startTime);
      const newDate = new Date(targetDate);
      newDate.setHours(originalDate.getHours());
      newDate.setMinutes(originalDate.getMinutes());
      newDate.setSeconds(0);
      newDate.setMilliseconds(0);

      if (draggedItem.type === "event") {
        // Update calendar event
        const event = events.find(e => e.id === draggedItem.id);
        if (!event) return;

        const timeDiff = newDate.getTime() - new Date(event.start_time).getTime();
        const newEndTime = event.end_time 
          ? new Date(new Date(event.end_time).getTime() + timeDiff).toISOString()
          : null;

        await updateCalendarEvent(draggedItem.id, {
          start_time: newDate.toISOString(),
          end_time: newEndTime,
        });
      } else {
        // Update task due_date
        await updateTask(draggedItem.id, {
          due_date: newDate.toISOString(),
        });
      }

      await loadData();
      setDraggedItem(null);
    } catch (error) {
      console.error("Error moving item:", error);
      alert("Erro ao mover item. Tente novamente.");
    }
  };

  const handleTaskClick = (task: any) => {
    setEditingTask({
      id: task.id,
      title: task.title,
      description: task.description || "",
      status: task.task_status || "pending",
      priority: task.task_priority || "medium",
      due_date: task.start_time ? task.start_time.slice(0, 16) : "",
    });
    setShowTaskModal(true);
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask.title) {
      alert("O título é obrigatório");
      return;
    }

    try {
      await updateTask(editingTask.id, {
        title: editingTask.title,
        description: editingTask.description || null,
        status: editingTask.status as any,
        priority: editingTask.priority as any,
        due_date: editingTask.due_date ? new Date(editingTask.due_date).toISOString() : null,
      });
      
      setShowTaskModal(false);
      await loadData();
    } catch (error) {
      console.error("Error updating task:", error);
      alert("Erro ao atualizar tarefa");
    }
  };

  const handleTaskDelete = async () => {
    if (!confirm("Tem a certeza que deseja eliminar esta tarefa?")) return;
    
    try {
      await deleteTask(editingTask.id);
      setShowTaskModal(false);
      await loadData();
    } catch (error) {
      console.error("Error deleting task:", error);
      alert("Erro ao eliminar tarefa");
    }
  };

  const handleCloseTaskModal = () => {
    setShowTaskModal(false);
    setEditingTask({
      id: "",
      title: "",
      description: "",
      status: "pending",
      priority: "medium",
      due_date: "",
    });
  };

  const getWeekDays = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      return day;
    });
  };

  const getMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    const days = [];
    const currentDay = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDay));
      currentDay.setDate(currentDay.getDate() + 1);
    }
    
    return days;
  };

  const getEventsForDay = (day: Date) => {
    const startOfDay = new Date(day.setHours(0, 0, 0, 0));
    const endOfDay = new Date(day.setHours(23, 59, 59, 999));
    
    return events.filter(event => {
      const eventDate = new Date(event.start_time);
      return eventDate >= startOfDay && eventDate <= endOfDay;
    });
  };

  const formatDate = (date: Date) => {
    if (viewMode === "day") {
      return date.toLocaleDateString("pt-PT", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    } else if (viewMode === "week") {
      const startOfWeek = new Date(date);
      startOfWeek.setDate(date.getDate() - date.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return `${startOfWeek.toLocaleDateString("pt-PT", { day: "numeric", month: "short" })} - ${endOfWeek.toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" })}`;
    } else {
      return date.toLocaleDateString("pt-PT", { month: "long", year: "numeric" });
    }
  };

  const filteredEvents = getEventsForView();

  return (
    <Layout title="Agenda">
      {showGoogleConnect && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowGoogleConnect(false)}>
          <div className="w-full max-w-md m-4" onClick={(e) => e.stopPropagation()}>
            <GoogleCalendarConnect 
              isConnected={googleConnected}
              onDisconnect={() => {
                setGoogleConnected(false);
                setShowGoogleConnect(false);
              }}
            />
          </div>
        </div>
      )}

      {showTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleCloseTaskModal}>
          <Card className="w-full max-w-lg m-4" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Editar Tarefa</span>
                <Button variant="ghost" size="sm" onClick={handleCloseTaskModal}>✕</Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleTaskSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="task-title">Título *</Label>
                  <Input
                    id="task-title"
                    value={editingTask.title}
                    onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="task-description">Descrição</Label>
                  <Textarea
                    id="task-description"
                    value={editingTask.description}
                    onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="task-status">Status</Label>
                    <Select
                      value={editingTask.status}
                      onValueChange={(value) => setEditingTask({ ...editingTask, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="in_progress">Em Progresso</SelectItem>
                        <SelectItem value="completed">Concluída</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="task-priority">Prioridade</Label>
                    <Select
                      value={editingTask.priority}
                      onValueChange={(value) => setEditingTask({ ...editingTask, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="task-duedate">Data Limite</Label>
                  <Input
                    id="task-duedate"
                    type="datetime-local"
                    value={editingTask.due_date}
                    onChange={(e) => setEditingTask({ ...editingTask, due_date: e.target.value })}
                  />
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Atualizar</Button>
                  <Button type="button" variant="outline" onClick={handleCloseTaskModal}>
                    Cancelar
                  </Button>
                  <Button type="button" variant="destructive" onClick={handleTaskDelete}>
                    Eliminar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="p-6">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Agenda</h1>
            <p className="text-gray-600 mt-1">Gerir eventos e compromissos</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleGoogleConnect}
              className="flex items-center gap-2"
            >
              {googleConnected ? (
                <>
                  <CalendarIcon className="h-4 w-4" />
                  Conectado
                </>
              ) : (
                <>
                  <Link className="h-4 w-4" />
                  Conectar Google
                </>
              )}
            </Button>
            {googleConnected && (
              <>
                <Button 
                  variant="outline"
                  onClick={syncWithGoogleCalendar}
                  disabled={syncing}
                  className="flex items-center gap-2"
                  title="Sincronização bidirecional: importa do Google e exporta eventos locais"
                >
                  <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                  {syncing ? "A sincronizar..." : "Sincronizar Tudo"}
                </Button>
              </>
            )}
            <Button onClick={() => setShowForm(true)} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="h-5 w-5 mr-2" />
              Novo Evento
            </Button>
          </div>
        </div>

        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{editingEventId ? "Editar Evento" : "Novo Evento"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="event_type">Tipo de Evento</Label>
                  <Select
                    value={newEvent.event_type}
                    onValueChange={(value) => setNewEvent({ ...newEvent, event_type: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="meeting">Reunião</SelectItem>
                      <SelectItem value="viewing">Visita</SelectItem>
                      <SelectItem value="call">Chamada</SelectItem>
                      <SelectItem value="followup">Follow-up</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_time">Data/Hora Início *</Label>
                    <Input
                      id="start_time"
                      type="datetime-local"
                      value={newEvent.start_time}
                      onChange={(e) => handleStartTimeChange(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_time">Data/Hora Fim</Label>
                    <Input
                      id="end_time"
                      type="datetime-local"
                      value={newEvent.end_time}
                      onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="lead">Lead Associada</Label>
                  <Select
                    value={newEvent.lead_id}
                    onValueChange={(value) => setNewEvent({ ...newEvent, lead_id: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma lead" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {leads.map((lead) => (
                        <SelectItem key={lead.id} value={lead.id}>
                          {lead.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="property">Imóvel Associado</Label>
                  <Select
                    value={newEvent.property_id}
                    onValueChange={(value) => setNewEvent({ ...newEvent, property_id: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um imóvel" />
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

                <div className="flex gap-2">
                  <Button type="submit">{editingEventId ? "Atualizar" : "Criar"}</Button>
                  <Button type="button" variant="outline" onClick={handleCancelEdit}>
                    Cancelar
                  </Button>
                  {editingEventId && (
                    <Button type="button" variant="destructive" onClick={handleDeleteEvent}>
                      Eliminar
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={() => navigateDate("prev")}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <CardTitle className="text-lg">{formatDate(currentDate)}</CardTitle>
                <Button variant="outline" size="sm" onClick={() => navigateDate("next")}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === "day" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("day")}
                >
                  Dia
                </Button>
                <Button
                  variant={viewMode === "week" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("week")}
                >
                  Semana
                </Button>
                <Button
                  variant={viewMode === "month" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("month")}
                >
                  Mês
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                <p className="text-gray-600 mt-4">A carregar eventos...</p>
              </div>
            ) : (
              <>
                {viewMode === "day" && (
                  <div className="space-y-2">
                    {filteredEvents.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">Sem eventos para hoje</p>
                    ) : (
                      filteredEvents.map((event) => (
                        <div 
                          key={event.id} 
                          draggable
                          onDragStart={(e) => handleDragStart(e, { 
                            id: event.id, 
                            type: event.event_type === "task" ? "task" : "event",
                            startTime: event.start_time 
                          })}
                          onDragEnd={handleDragEnd}
                          className={`border rounded-lg p-4 cursor-move transition-opacity ${
                            event.event_type === "task" 
                              ? "bg-blue-50 hover:bg-blue-100" 
                              : "bg-purple-50 hover:bg-purple-100"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1" onClick={() => {
                              if (event.event_type === "task") {
                                handleTaskClick(event);
                              } else {
                                handleEventClick(event);
                              }
                            }}>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{event.title}</h3>
                                {event.event_type === "task" && event.task_status && (
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    event.task_status === "completed" 
                                      ? "bg-green-100 text-green-800" 
                                      : event.task_status === "in_progress"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-gray-100 text-gray-800"
                                  }`}>
                                    {event.task_status === "completed" ? "Concluída" : 
                                     event.task_status === "in_progress" ? "Em Progresso" : "Pendente"}
                                  </span>
                                )}
                                {event.google_event_id && (
                                  <Badge variant="outline" className="text-xs">
                                    <CalendarIcon className="h-3 w-3 mr-1" />
                                    Google
                                  </Badge>
                                )}
                              </div>
                              {event.description && (
                                <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                              )}
                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  {new Date(event.start_time).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                                <span className="capitalize">
                                  {event.event_type === "task" ? "Tarefa" : event.event_type}
                                </span>
                                {event.event_type === "task" && event.task_priority && (
                                  <span className={`px-2 py-0.5 rounded text-xs ${
                                    event.task_priority === "high" 
                                      ? "bg-red-100 text-red-800" 
                                      : event.task_priority === "medium"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-gray-100 text-gray-800"
                                  }`}>
                                    {event.task_priority === "high" ? "Alta" : 
                                     event.task_priority === "medium" ? "Média" : "Baixa"}
                                  </span>
                                )}
                              </div>
                            </div>
                            {googleConnected && googleConfigured && event.event_type !== "task" && !event.google_event_id && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  exportToGoogleCalendar(event.id);
                                }}
                                className="ml-2"
                                title="Exportar para Google Calendar"
                              >
                                <CalendarIcon className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {viewMode === "week" && (
                  <div className="grid grid-cols-7 gap-2">
                    {getWeekDays().map((day, index) => {
                      const dayEvents = getEventsForDay(day);
                      const isToday = day.toDateString() === new Date().toDateString();
                      
                      return (
                        <div 
                          key={index} 
                          className={`border rounded-lg p-2 min-h-[200px] ${isToday ? "bg-purple-50 border-purple-300" : ""}`}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, day)}
                        >
                          <div className="font-semibold text-sm mb-2">
                            {day.toLocaleDateString("pt-PT", { weekday: "short", day: "numeric" })}
                          </div>
                          <div className="space-y-1">
                            {dayEvents.map((event) => (
                              <div 
                                key={event.id} 
                                draggable
                                onDragStart={(e) => handleDragStart(e, { 
                                  id: event.id, 
                                  type: event.event_type === "task" ? "task" : "event",
                                  startTime: event.start_time 
                                })}
                                onDragEnd={handleDragEnd}
                                className={`text-xs rounded p-1 truncate cursor-move transition-opacity ${
                                  event.event_type === "task" 
                                    ? "bg-blue-100 hover:bg-blue-200" 
                                    : "bg-purple-100 hover:bg-purple-200"
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (event.event_type === "task") {
                                    handleTaskClick(event);
                                  } else {
                                    handleEventClick(event);
                                  }
                                }}
                              >
                                <div className="font-medium">
                                  {new Date(event.start_time).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
                                </div>
                                <div className="truncate">{event.title}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {viewMode === "month" && (
                  <div>
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
                        <div key={day} className="text-center font-semibold text-sm text-gray-600 py-2">
                          {day}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {getMonthDays().map((day, index) => {
                        const dayEvents = getEventsForDay(day);
                        const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                        const isToday = day.toDateString() === new Date().toDateString();
                        
                        return (
                          <div
                            key={index}
                            className={`border rounded-lg p-2 min-h-[100px] ${
                              !isCurrentMonth ? "bg-gray-50 text-gray-400" : ""
                            } ${isToday ? "bg-purple-50 border-purple-300" : ""}`}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, day)}
                          >
                            <div className="font-semibold text-sm mb-1">
                              {day.getDate()}
                            </div>
                            <div className="space-y-1">
                              {dayEvents.slice(0, 2).map((event) => (
                                <div 
                                  key={event.id} 
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, { 
                                    id: event.id, 
                                    type: event.event_type === "task" ? "task" : "event",
                                    startTime: event.start_time 
                                  })}
                                  onDragEnd={handleDragEnd}
                                  className={`text-xs rounded p-1 truncate cursor-move transition-opacity ${
                                    event.event_type === "task" 
                                      ? "bg-blue-100 hover:bg-blue-200" 
                                      : "bg-purple-100 hover:bg-purple-200"
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (event.event_type === "task") {
                                      handleTaskClick(event);
                                    } else {
                                      handleEventClick(event);
                                    }
                                  }}
                                >
                                  {event.title}
                                </div>
                              ))}
                              {dayEvents.length > 2 && (
                                <div className="text-xs text-purple-600 font-medium">
                                  +{dayEvents.length - 2} mais
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}