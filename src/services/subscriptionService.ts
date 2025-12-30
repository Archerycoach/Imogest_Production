import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { getUserProfile } from "./profileService";

type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];
type SubscriptionPlan = Database["public"]["Tables"]["subscription_plans"]["Row"];
type PaymentHistory = Database["public"]["Tables"]["payment_history"]["Row"];

// Define types manually to avoid deep inference issues with Supabase joins
export interface SubscriptionWithPlan extends Subscription {
  subscription_plans: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    currency: string;
    billing_interval: "monthly" | "yearly";
    features: any;
    limits: any;
    is_active: boolean;
    stripe_price_id: string;
    stripe_product_id: string;
    created_at: string;
    updated_at: string;
  } | null;
}

export interface PaymentHistoryWithDetails extends PaymentHistory {
  subscriptions: {
    subscription_plans: {
      name: string;
    } | null;
  } | null;
}

export const getCurrentSubscription = async (userId: string): Promise<Subscription | null> => {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.error("Error fetching subscription:", error);
    return null;
  }

  return data;
};

/**
 * Check if user has access to premium features
 * Admins always have access, regardless of subscription
 */
export const hasAccess = async (userId: string): Promise<boolean> => {
  try {
    // Check if user is admin
    const profile = await getUserProfile();
    
    // ✅ Admins bypass subscription check
    if (profile?.role === "admin") {
      return true;
    }

    // For non-admins, check subscription
    const subscription = await getCurrentSubscription(userId);
    return subscription !== null && subscription.status === "active";
  } catch (error) {
    console.error("Error checking access:", error);
    return false;
  }
};

export const createSubscription = async (
  userId: string,
  planId: string,
  trialDays: number = 0,
  stripeSubscriptionId?: string
): Promise<Subscription | null> => {
  const startDate = new Date();
  const endDate = new Date();
  
  if (trialDays > 0) {
    endDate.setDate(endDate.getDate() + trialDays);
  } else {
    endDate.setMonth(endDate.getMonth() + 1); // Default 1 month
  }

  const { data, error } = await supabase
    .from("subscriptions")
    .insert({
      user_id: userId,
      plan_id: planId,
      stripe_subscription_id: stripeSubscriptionId || null,
      status: trialDays > 0 ? "trialing" : "active",
      current_period_start: startDate.toISOString(),
      current_period_end: endDate.toISOString(),
      trial_end: trialDays > 0 ? endDate.toISOString() : null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating subscription:", error);
    return null;
  }

  return data;
};

export const updateSubscriptionStatus = async (
  subscriptionId: string,
  status: "trialing" | "active" | "cancelled" | "past_due" | "unpaid"
): Promise<boolean> => {
  const { error } = await supabase
    .from("subscriptions")
    .update({ status })
    .eq("id", subscriptionId);

  if (error) {
    console.error("Error updating subscription status:", error);
    return false;
  }

  return true;
};

export const cancelSubscription = async (subscriptionId: string): Promise<boolean> => {
  return updateSubscriptionStatus(subscriptionId, "cancelled");
};

export const activateSubscription = async (
  subscriptionId: string,
  months: number
): Promise<boolean> => {
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + months);

  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "active",
      current_period_end: endDate.toISOString(),
      trial_end: null,
    })
    .eq("id", subscriptionId);

  if (error) {
    console.error("Error activating subscription:", error);
    return false;
  }

  return true;
};

export const extendSubscription = async (
  subscriptionId: string,
  months: number
): Promise<boolean> => {
  // Get current subscription
  const { data: subscription, error: fetchError } = await supabase
    .from("subscriptions")
    .select("current_period_end")
    .eq("id", subscriptionId)
    .single();

  if (fetchError || !subscription) {
    console.error("Error fetching subscription:", fetchError);
    return false;
  }

  // Extend from current end date
  const currentEndDate = new Date(subscription.current_period_end || new Date().toISOString());
  currentEndDate.setMonth(currentEndDate.getMonth() + months);

  const { error } = await supabase
    .from("subscriptions")
    .update({ current_period_end: currentEndDate.toISOString() })
    .eq("id", subscriptionId);

  if (error) {
    console.error("Error extending subscription:", error);
    return false;
  }

  return true;
};

export const getAllSubscriptions = async (filters: any = {}) => {
  let query = (supabase as any)
    .from("subscriptions")
    .select(`
      *,
      subscription_plans (
        id,
        name,
        description,
        price,
        currency,
        billing_interval,
        features,
        limits,
        is_active,
        stripe_price_id,
        stripe_product_id,
        created_at,
        updated_at
      )
    `)
    .order("created_at", { ascending: false });

  // Apply filters if provided
  if (filters) {
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined) {
        query = query.eq(key, filters[key]);
      }
    });
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching all subscriptions:", error);
    return [];
  }

  // Force cast since we know the structure matches
  return (data as unknown) as SubscriptionWithPlan[];
};

export const getSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("is_active", true)
    .order("price", { ascending: true });

  if (error) {
    console.error("Error fetching subscription plans:", error);
    return [];
  }

  return data || [];
};

export const getUserSubscription = async (userId: string): Promise<SubscriptionWithPlan | null> => {
  const { data, error } = await supabase
    .from("subscriptions")
    .select(`
      *,
      subscription_plans (
        id,
        name,
        description,
        price,
        currency,
        billing_interval,
        features,
        limits,
        is_active,
        stripe_price_id,
        stripe_product_id,
        created_at,
        updated_at
      )
    `)
    .eq("user_id", userId)
    .in("status", ["trialing", "active"])
    .maybeSingle();

  if (error) {
    console.error("Error fetching user subscription:", error);
    return null;
  }

  return data as unknown as SubscriptionWithPlan | null;
};

export const getPaymentHistory = async (userId: string): Promise<PaymentHistoryWithDetails[]> => {
  const { data, error } = await supabase
    .from("payment_history")
    .select(`
      *,
      subscriptions (
        subscription_plans (
          name
        )
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching payment history:", error);
    return [];
  }

  return data as unknown as PaymentHistoryWithDetails[];
};

export const getSubscriptionStats = async (filters: any = {}) => {
  // Get all subscriptions to calculate stats
  const { data, error } = await supabase
    .from("subscriptions")
    .select("status, plan_id");

  if (error) {
    console.error("Error fetching subscription stats:", error);
    return {
      total: 0,
      active: 0,
      trial: 0,
      cancelled: 0,
      expired: 0,
    };
  }

  const stats = {
    total: data.length,
    active: data.filter(s => s.status === "active").length,
    trial: data.filter(s => s.status === "trialing").length,
    cancelled: data.filter(s => s.status === "cancelled").length,
    expired: data.filter(s => s.status === "past_due").length, // Mapping past_due to expired concept for stats
  };

  return stats;
};