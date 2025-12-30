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
export const createTask = async (task: TaskInsert) => {
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      ...task,
      status: task.status as any,
      priority: task.priority as any
    })
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