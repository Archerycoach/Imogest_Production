import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, CheckCircle2, Clock, AlertCircle, Trash2, StickyNote, Edit } from "lucide-react";
import { getTasks, createTask, completeTask, deleteTask, getTaskStats, updateTask } from "@/services/tasksService";
import { getLeads } from "@/services/leadsService";
import { getProperties } from "@/services/propertiesService";
import { supabase } from "@/integrations/supabase/client";

export default function TasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "in_progress" | "completed">("all");
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesContent, setNotesContent] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    notes: "",
    status: "pending",
    priority: "medium",
    due_date: "",
    lead_id: "",
    property_id: "",
  });

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  useEffect(() => {
    if (showForm || editingTask) {
      loadLeads();
      loadProperties();
    }
  }, [showForm, editingTask]);

  const checkAuthAndLoad = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/login");
      return;
    }
    loadTasks();
    loadStats();
  };

  const loadTasks = async () => {
    try {
      setIsLoading(true);
      const data = await getTasks();
      setTasks(data);
    } catch (error) {
      console.error("Error loading tasks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await getTaskStats();
      setStats(data);
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const loadLeads = async () => {
    try {
      const data = await getLeads();
      setLeads(data);
    } catch (error) {
      console.error("Error loading leads:", error);
    }
  };

  const loadProperties = async () => {
    try {
      const data = await getProperties();
      setProperties(data);
    } catch (error) {
      console.error("Error loading properties:", error);
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await completeTask(id);
      await loadTasks();
      await loadStats();
    } catch (error) {
      console.error("Error completing task:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta tarefa?")) return;
    try {
      await deleteTask(id);
      await loadTasks();
      await loadStats();
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const handleSaveNotes = async (taskId: string) => {
    try {
      await updateTask(taskId, { notes: notesContent });
      await loadTasks();
      setEditingNotes(null);
      setNotesContent("");
    } catch (error) {
      console.error("Error saving notes:", error);
      alert("Erro ao guardar notas. Tente novamente.");
    }
  };

  const handleEditNotes = (taskId: string, currentNotes?: string) => {
    setEditingNotes(taskId);
    setNotesContent(currentNotes || "");
  };

  const handleEdit = (task: any) => {
    setEditingTask(task);
    setFormData({
      title: task.title || "",
      description: task.description || "",
      notes: task.notes || "",
      status: task.status || "pending",
      priority: task.priority || "medium",
      due_date: task.due_date || "",
      lead_id: task.lead_id || "",
      property_id: task.property_id || "",
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "in_progress":
        return <Clock className="h-5 w-5 text-blue-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (filter === "all") return true;
    return task.status === filter;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const taskData = {
        title: formData.title,
        description: formData.description || null,
        notes: formData.notes || null,
        status: formData.status,
        priority: formData.priority,
        due_date: formData.due_date || null,
        lead_id: formData.lead_id || null,
        property_id: formData.property_id || null,
        user_id: session.user.id
      };

      if (editingTask) {
        await updateTask(editingTask.id, taskData);
      } else {
        await createTask(taskData);
      }

      setShowForm(false);
      setEditingTask(null);
      setFormData({
        title: "",
        description: "",
        notes: "",
        status: "pending",
        priority: "medium",
        due_date: "",
        lead_id: "",
        property_id: "",
      });
      await loadTasks();
      await loadStats();
    } catch (error) {
      console.error("Error saving task:", error);
      alert("Erro ao guardar tarefa. Tente novamente.");
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingTask(null);
    setFormData({
      title: "",
      description: "",
      notes: "",
      status: "pending",
      priority: "medium",
      due_date: "",
      lead_id: "",
      property_id: "",
    });
  };

  return (
    <Layout title="Tarefas">
      <div className="p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Tarefas</h1>
            <p className="text-slate-600">Gerencie suas tarefas e acompanhe o progresso</p>
          </div>
          <Button 
            className="gap-2"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-5 w-5" />
            Nova Tarefa
          </Button>
        </div>

        {/* Task Form Dialog */}
        <Dialog open={showForm || !!editingTask} onOpenChange={(open) => !open && resetForm()}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{editingTask ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Título *</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border rounded-md"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Descrição</label>
                <textarea
                  className="w-full px-3 py-2 border rounded-md"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Notas</label>
                <textarea
                  className="w-full px-3 py-2 border rounded-md"
                  rows={4}
                  placeholder="Adicione notas detalhadas sobre esta tarefa..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <select
                    className="w-full px-3 py-2 border rounded-md"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="pending">Pendente</option>
                    <option value="in_progress">Em Progresso</option>
                    <option value="completed">Concluído</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Prioridade</label>
                  <select
                    className="w-full px-3 py-2 border rounded-md"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Vencimento</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border rounded-md"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Lead (opcional)</label>
                  <select
                    className="w-full px-3 py-2 border rounded-md"
                    value={formData.lead_id}
                    onChange={(e) => setFormData({ ...formData, lead_id: e.target.value })}
                  >
                    <option value="">Nenhuma</option>
                    {leads.map((lead) => (
                      <option key={lead.id} value={lead.id}>
                        {lead.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Imóvel (opcional)</label>
                  <select
                    className="w-full px-3 py-2 border rounded-md"
                    value={formData.property_id}
                    onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
                  >
                    <option value="">Nenhum</option>
                    {properties.map((prop) => (
                      <option key={prop.id} value={prop.id}>
                        {prop.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingTask ? "Atualizar Tarefa" : "Criar Tarefa"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-800 mb-1">{stats.total}</div>
                  <div className="text-sm text-slate-600">Total</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600 mb-1">{stats.pending}</div>
                  <div className="text-sm text-slate-600">Pendentes</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-1">{stats.inProgress}</div>
                  <div className="text-sm text-slate-600">Em Progresso</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 mb-1">{stats.completed}</div>
                  <div className="text-sm text-slate-600">Concluídas</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600 mb-1">{stats.overdue}</div>
                  <div className="text-sm text-slate-600">Atrasadas</div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
          >
            Todas
          </Button>
          <Button
            variant={filter === "pending" ? "default" : "outline"}
            onClick={() => setFilter("pending")}
          >
            Pendentes
          </Button>
          <Button
            variant={filter === "in_progress" ? "default" : "outline"}
            onClick={() => setFilter("in_progress")}
          >
            Em Progresso
          </Button>
          <Button
            variant={filter === "completed" ? "default" : "outline"}
            onClick={() => setFilter("completed")}
          >
            Concluídas
          </Button>
        </div>

        {/* Tasks List */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Tarefas ({filteredTasks.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-slate-500">Carregando...</div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                Nenhuma tarefa encontrada
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1">
                        {getStatusIcon(task.status)}
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-800 mb-1">{task.title}</h3>
                          {task.description && (
                            <p className="text-sm text-slate-600 mb-2">{task.description}</p>
                          )}
                          {task.notes && (
                            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                              <div className="flex items-start gap-2">
                                <StickyNote className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-slate-700 whitespace-pre-wrap">{task.notes}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge className={getPriorityColor(task.priority)}>
                        {task.priority === "high" && "Alta"}
                        {task.priority === "medium" && "Média"}
                        {task.priority === "low" && "Baixa"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-4 text-sm text-slate-500">
                        {task.due_date && (
                          <div>
                            Vencimento:{" "}
                            {new Date(task.due_date).toLocaleDateString("pt-PT")}
                          </div>
                        )}
                        {task.lead?.name && <div>Lead: {task.lead.name}</div>}
                        {task.property?.title && <div>Imóvel: {task.property.title}</div>}
                      </div>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Notas da Tarefa</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm font-medium mb-2 block">
                                  Adicione ou edite as notas desta tarefa:
                                </label>
                                <Textarea
                                  value={notesContent}
                                  onChange={(e) => setNotesContent(e.target.value)}
                                  placeholder="Escreva suas notas aqui..."
                                  rows={10}
                                  className="w-full"
                                />
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setEditingNotes(null);
                                    setNotesContent("");
                                  }}
                                >
                                  Cancelar
                                </Button>
                                <Button onClick={() => handleSaveNotes(task.id)}>
                                  Guardar Notas
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(task)}
                          className="gap-1"
                        >
                          <Edit className="h-4 w-4" />
                          Editar
                        </Button>
                        {task.status !== "completed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleComplete(task.id)}
                            className="gap-1"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Concluir
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(task.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}