import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Task = Database["public"]["Tables"]["tasks"]["Row"];
type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];

// Get all tasks for current user
export const getTasks = async (): Promise<Task[]> => {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("due_date", { ascending: true });

  if (error) {
    console.error("Error fetching tasks:", error);
    return [];
  }

  return data || [];
};

// Alias for compatibility
export const getAllTasks = getTasks;

// Get single task by ID
export const getTask = async (id: string): Promise<Task | null> => {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching task:", error);
    return null;
  }

  return data;
};

// Create new task
export const createTask = async (task: TaskInsert & { lead_id?: string | null, contact_id?: string | null }) => {
  // Map frontend IDs to database columns
  const dbTask = {
    ...task,
    related_lead_id: task.lead_id || task.related_lead_id,
    related_contact_id: task.contact_id || task.related_contact_id,
    status: task.status as any,
    priority: task.priority as any
  };
  
  // Remove frontend-only properties if they exist
  delete (dbTask as any).lead_id;
  delete (dbTask as any).contact_id;

  const { data, error } = await supabase
    .from("tasks")
    .insert(dbTask)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Update task
export const updateTask = async (id: string, updates: TaskUpdate) => {
  const { data, error } = await supabase
    .from("tasks")
    .update({
      ...updates,
      status: updates.status as any,
      priority: updates.priority as any
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Delete task
export const deleteTask = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id);

  if (error) throw error;
};

// Toggle task completion
export const toggleTaskCompletion = async (id: string, currentStatus: string): Promise<Task> => {
  const newStatus = currentStatus === "completed" ? "pending" : "completed";
  
  const { data, error } = await supabase
    .from("tasks")
    .update({ status: newStatus })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const completeTask = async (id: string) => {
  return updateTask(id, { status: "completed" });
};

export const getTaskStats = async () => {
  const { data: tasks } = await supabase.from("tasks").select("status, due_date");
  
  if (!tasks) return { total: 0, pending: 0, inProgress: 0, completed: 0, overdue: 0 };
  
  const now = new Date();
  
  return {
    total: tasks.length,
    pending: tasks.filter(t => t.status === "pending").length,
    inProgress: tasks.filter(t => t.status === "in_progress").length,
    completed: tasks.filter(t => t.status === "completed").length,
    overdue: tasks.filter(t => t.status !== "completed" && t.due_date && new Date(t.due_date) < now).length
  };
};

// Get tasks by status
export const getTasksByStatus = async (status: string): Promise<Task[]> => {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("status", status as any) // Cast to any
    .order("due_date", { ascending: true });

  if (error) {
    console.error("Error fetching tasks by status:", error);
    return [];
  }

  return data || [];
};

// Get tasks by priority
export const getTasksByPriority = async (priority: string): Promise<Task[]> => {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("priority", priority as any) // Cast to any
    .order("due_date", { ascending: true });

  if (error) {
    console.error("Error fetching tasks by priority:", error);
    return [];
  }

  return data || [];
};

// Get overdue tasks
export const getOverdueTasks = async (): Promise<Task[]> => {
  const now = new Date().toISOString();
  
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .neq("status", "completed")
    .lt("due_date", now)
    .order("due_date", { ascending: true });

  if (error) {
    console.error("Error fetching overdue tasks:", error);
    return [];
  }

  return data || [];
};