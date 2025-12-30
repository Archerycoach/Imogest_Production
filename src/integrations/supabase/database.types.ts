export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          avatar_url: string | null
          role: "admin" | "team_lead" | "agent"
          team_lead_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
          phone: string | null
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          role?: "admin" | "team_lead" | "agent"
          team_lead_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          phone?: string | null
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          role?: "admin" | "team_lead" | "agent"
          team_lead_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          phone?: string | null
        }
      }
      leads: {
        Row: {
          id: string
          user_id: string
          name: string
          email: string | null
          phone: string | null
          status: string
          lead_type: string
          budget: number | null
          notes: string | null
          source: string | null
          created_at: string
          updated_at: string
          property_id: string | null
          location_preference: string | null
          typology: string | null
          energy_rating: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          email?: string | null
          phone?: string | null
          status?: string
          lead_type?: string
          budget?: number | null
          notes?: string | null
          source?: string | null
          created_at?: string
          updated_at?: string
          property_id?: string | null
          location_preference?: string | null
          typology?: string | null
          energy_rating?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          email?: string | null
          phone?: string | null
          status?: string
          lead_type?: string
          budget?: number | null
          notes?: string | null
          source?: string | null
          created_at?: string
          updated_at?: string
          property_id?: string | null
          location_preference?: string | null
          typology?: string | null
          energy_rating?: string | null
        }
      }
      properties: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          price: number
          status: string
          property_type: string
          address: string | null
          city: string | null
          postal_code: string | null
          area: number | null
          bedrooms: number | null
          bathrooms: number | null
          images: string[] | null
          features: string[] | null
          created_at: string
          updated_at: string
          slug: string
          energy_rating: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          price: number
          status?: string
          property_type?: string
          address?: string | null
          city?: string | null
          postal_code?: string | null
          area?: number | null
          bedrooms?: number | null
          bathrooms?: number | null
          images?: string[] | null
          features?: string[] | null
          created_at?: string
          updated_at?: string
          slug?: string
          energy_rating?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          price?: number
          status?: string
          property_type?: string
          address?: string | null
          city?: string | null
          postal_code?: string | null
          area?: number | null
          bedrooms?: number | null
          bathrooms?: number | null
          images?: string[] | null
          features?: string[] | null
          created_at?: string
          updated_at?: string
          slug?: string
          energy_rating?: string | null
        }
      }
      tasks: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          status: string
          priority: string
          due_date: string | null
          related_to: string | null
          related_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          status?: string
          priority?: string
          due_date?: string | null
          related_to?: string | null
          related_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          status?: string
          priority?: string
          due_date?: string | null
          related_to?: string | null
          related_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          plan_id: string | null
          status: string
          stripe_subscription_id: string | null
          stripe_customer_id: string | null
          current_period_start: string
          current_period_end: string | null
          cancel_at_period_end: boolean
          trial_start: string | null
          trial_end: string | null
          created_at: string
          updated_at: string
          billing_interval: string | null
        }
        Insert: {
          id?: string
          user_id: string
          plan_id?: string | null
          status: string
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          current_period_start?: string
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          trial_start?: string | null
          trial_end?: string | null
          created_at?: string
          updated_at?: string
          billing_interval?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          plan_id?: string | null
          status?: string
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          current_period_start?: string
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          trial_start?: string | null
          trial_end?: string | null
          created_at?: string
          updated_at?: string
          billing_interval?: string | null
        }
      }
      subscription_plans: {
        Row: {
          id: string
          name: string
          description: string | null
          price: number
          currency: string
          billing_interval: string
          stripe_price_id: string | null
          features: string[] | null
          limits: Json | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          price: number
          currency?: string
          billing_interval?: string
          stripe_price_id?: string | null
          features?: string[] | null
          limits?: Json | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          price?: number
          currency?: string
          billing_interval?: string
          stripe_price_id?: string | null
          features?: string[] | null
          limits?: Json | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      payment_history: {
        Row: {
          id: string
          user_id: string
          subscription_id: string | null
          amount: number
          currency: string
          status: string
          payment_method: string | null
          payment_provider: string | null
          transaction_id: string | null
          provider_transaction_id: string | null
          payment_date: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          subscription_id?: string | null
          amount: number
          currency?: string
          status?: string
          payment_method?: string | null
          payment_provider?: string | null
          transaction_id?: string | null
          provider_transaction_id?: string | null
          payment_date?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          subscription_id?: string | null
          amount?: number
          currency?: string
          status?: string
          payment_method?: string | null
          payment_provider?: string | null
          transaction_id?: string | null
          provider_transaction_id?: string | null
          payment_date?: string | null
          metadata?: Json | null
          created_at?: string
        }
      }
      system_settings: {
        Row: {
          id: string
          key: string
          value: Json
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value: Json
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: Json
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      activity_logs: {
        Row: {
          id: string
          user_id: string
          action: string
          entity_type: string
          entity_id: string | null
          details: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          entity_type: string
          entity_id?: string | null
          details?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          entity_type?: string
          entity_id?: string | null
          details?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
      templates: {
        Row: {
          id: string
          user_id: string
          name: string
          template_type: string
          subject: string | null
          body: string
          variables: string[] | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          template_type?: string
          subject?: string | null
          body: string
          variables?: string[] | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          template_type?: string
          subject?: string | null
          body?: string
          variables?: string[] | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      interactions: {
        Row: {
          id: string
          user_id: string
          lead_id: string
          property_id: string | null
          interaction_type: string
          subject: string | null
          content: string | null
          interaction_date: string
          outcome: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          lead_id: string
          property_id?: string | null
          interaction_type: string
          subject?: string | null
          content?: string | null
          interaction_date?: string
          outcome?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          lead_id?: string
          property_id?: string | null
          interaction_type?: string
          subject?: string | null
          content?: string | null
          interaction_date?: string
          outcome?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          notification_type: string
          title: string
          message: string
          is_read: boolean
          related_entity_type: string | null
          related_entity_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          notification_type: string
          title: string
          message: string
          is_read?: boolean
          related_entity_type?: string | null
          related_entity_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          notification_type?: string
          title?: string
          message?: string
          is_read?: boolean
          related_entity_type?: string | null
          related_entity_id?: string | null
          created_at?: string
        }
      }
      lead_workflow_rules: {
        Row: {
          id: string
          user_id: string
          template_id: string | null
          name: string
          description: string | null
          trigger_status: string
          action_type: string
          action_config: Json | null
          delay_days: number
          delay_hours: number
          enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          template_id?: string | null
          name: string
          description?: string | null
          trigger_status?: string
          action_type: string
          action_config?: Json | null
          delay_days?: number
          delay_hours?: number
          enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          template_id?: string | null
          name?: string
          description?: string | null
          trigger_status?: string
          action_type?: string
          action_config?: Json | null
          delay_days?: number
          delay_hours?: number
          enabled?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      calendar_events: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          start_time: string
          end_time: string
          location: string | null
          event_type: string
          attendees: string[] | null
          lead_id: string | null
          property_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          start_time: string
          end_time: string
          location?: string | null
          event_type?: string
          attendees?: string[] | null
          lead_id?: string | null
          property_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          start_time?: string
          end_time?: string
          location?: string | null
          event_type?: string
          attendees?: string[] | null
          lead_id?: string | null
          property_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}