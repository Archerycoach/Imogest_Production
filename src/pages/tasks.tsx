import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, CheckCircle, Clock, AlertTriangle, Calendar as CalendarIcon, Filter } from "lucide-react";
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
} from "@/services/tasksService";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import type { Database } from "@/integrations/supabase/types";

type Task = Database["public"]["Tables"]["tasks"]["Row"];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    due_date: "",
    priority: "medium",
    status: "pending",
    related_to: null as "lead" | "property" | null,
    related_id: null as string | null
  });

  useEffect(() => {
    checkAuth();
    loadTasks();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
    }
  };

  const loadTasks = async () => {
    try {
      const data = await getTasks();
      setTasks(data);
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro",
        description: "Erro ao carregar tarefas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingTask) {
        await updateTask(editingTask.id, {
          title: formData.title,
          description: formData.description,
          due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
          priority: formData.priority as any,
          status: formData.status as any,
          related_to: formData.related_to as any,
          related_id: formData.related_id,
        });
        
        toast({ title: "Sucesso", description: "Tarefa atualizada" });
      } else {
        await createTask({
          user_id: user.id,
          title: formData.title,
          description: formData.description,
          due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
          priority: formData.priority as any,
          status: "pending",
          related_to: formData.related_to as any,
          related_id: formData.related_id,
        });
        
        toast({ title: "Sucesso", description: "Tarefa criada" });
      }

      setIsDialogOpen(false);
      resetForm();
      loadTasks();
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro",
        description: "Erro ao guardar tarefa",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminar tarefa?")) return;
    try {
      await deleteTask(id);
      setTasks(tasks.filter(t => t.id !== id));
      toast({ title: "Sucesso", description: "Tarefa eliminada" });
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao eliminar tarefa", variant: "destructive" });
    }
  };

  const handleToggleComplete = async (task: Task) => {
    try {
      const newStatus = task.status === "completed" ? "pending" : "completed";
      await updateTask(task.id, { status: newStatus });
      
      setTasks(tasks.map(t => 
        t.id === task.id ? { ...t, status: newStatus } : t
      ));
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao atualizar estado", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      due_date: "",
      priority: "medium",
      status: "pending",
      related_to: null,
      related_id: null
    });
    setEditingTask(null);
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || "",
      due_date: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : "",
      priority: task.priority,
      status: task.status,
      related_to: task.related_to as any,
      related_id: task.related_id
    });
    setIsDialogOpen(true);
  };

  const filteredTasks = tasks.filter(t => 
    filterStatus === "all" || t.status === filterStatus
  );

  return (
    <ProtectedRoute>
      <Layout>
        <div className="p-8 max-w-6xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Tarefas</h1>
              <p className="text-slate-500 mt-1">Organize o seu dia-a-dia</p>
            </div>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Nova Tarefa
            </Button>
          </div>

          <div className="flex gap-2 mb-4">
            <Button 
              variant={filterStatus === "all" ? "default" : "outline"} 
              size="sm" 
              onClick={() => setFilterStatus("all")}
            >
              Todas
            </Button>
            <Button 
              variant={filterStatus === "pending" ? "default" : "outline"} 
              size="sm" 
              onClick={() => setFilterStatus("pending")}
            >
              Pendentes
            </Button>
            <Button 
              variant={filterStatus === "completed" ? "default" : "outline"} 
              size="sm" 
              onClick={() => setFilterStatus("completed")}
            >
              Concluídas
            </Button>
          </div>

          <div className="grid gap-4">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-dashed">
                <CheckCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900">Sem tarefas</h3>
                <p className="text-slate-500">Não existem tarefas com este filtro.</p>
              </div>
            ) : filteredTasks.map(task => (
              <Card key={task.id} className={`transition-all ${task.status === 'completed' ? 'opacity-60 bg-slate-50' : 'bg-white'}`}>
                <CardContent className="p-4 flex items-center gap-4">
                  <Checkbox 
                    checked={task.status === 'completed'}
                    onCheckedChange={() => handleToggleComplete(task)}
                  />
                  <div className="flex-1">
                    <h3 className={`font-medium ${task.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="text-sm text-slate-500 mt-1">{task.description}</p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline" className={
                        task.priority === 'high' ? 'text-red-600 border-red-200 bg-red-50' :
                        task.priority === 'medium' ? 'text-yellow-600 border-yellow-200 bg-yellow-50' :
                        'text-green-600 border-green-200 bg-green-50'
                      }>
                        {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                      </Badge>
                      {task.due_date && (
                        <span className="flex items-center text-xs text-slate-500">
                          <CalendarIcon className="h-3 w-3 mr-1" />
                          {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(task)}>Editar</Button>
                    <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(task.id)}>Eliminar</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingTask ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
                <DialogDescription>Detalhes da tarefa a realizar.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateTask} className="space-y-4">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input 
                    required 
                    value={formData.title} 
                    onChange={e => setFormData({...formData, title: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <Select 
                    value={formData.priority} 
                    onValueChange={value => setFormData({...formData, priority: value})}
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

                <div className="space-y-2">
                  <Label>Data Limite</Label>
                  <Input 
                    type="date"
                    value={formData.due_date} 
                    onChange={e => setFormData({...formData, due_date: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea 
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit">Guardar</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}