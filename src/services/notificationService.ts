import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type NotificationType = 
  | 'lead_assigned' 
  | 'lead_overdue' 
  | 'task_due' 
  | 'property_match' 
  | 'system'
  | 'message'
  | 'info' 
  | 'success' 
  | 'warning' 
  | 'error';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  data?: any;
  created_at: string;
  related_entity_id?: string;
  related_entity_type?: string;
}

type NotificationInsert = Database["public"]["Tables"]["notifications"]["Insert"];

export const getNotifications = async (limit = 20) => {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  
  return data.map(n => ({
    id: n.id,
    user_id: n.user_id,
    type: n.notification_type as NotificationType,
    title: n.title,
    message: n.message,
    read: n.is_read || false,
    created_at: n.created_at,
    related_entity_id: n.related_entity_id || undefined,
    related_entity_type: n.related_entity_type || undefined
  })) as Notification[];
};

export const getUnreadCount = async () => {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("is_read", false);

  if (error) throw error;
  return count || 0;
};

export const getUserNotifications = async (userId: string) => {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }

  return data.map(n => ({
    id: n.id,
    user_id: n.user_id,
    type: n.notification_type as NotificationType,
    title: n.title,
    message: n.message,
    read: n.is_read || false,
    created_at: n.created_at,
    related_entity_id: n.related_entity_id || undefined,
    related_entity_type: n.related_entity_type || undefined
  })) as Notification[];
};

export const markNotificationAsRead = async (id: string) => {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id);

  if (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }

  return true;
};

export const markAllAsRead = async (userId?: string) => {
  let query = supabase.from("notifications").update({ is_read: true });
  
  if (userId) {
    query = query.eq("user_id", userId);
  } else {
    // If no userId provided, try to get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      query = query.eq("user_id", user.id);
    } else {
      return false;
    }
  }

  const { error } = await query;

  if (error) {
    console.error("Error marking all notifications as read:", error);
    throw error;
  }

  return true;
};

export const createNotification = async (notification: NotificationInsert) => {
  const { data, error } = await supabase
    .from("notifications")
    .insert(notification as any)
    .select()
    .single();

  if (error) {
    console.error("Error creating notification:", error);
  }
};