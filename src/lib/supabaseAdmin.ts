import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Server-side Supabase client with SERVICE_ROLE_KEY
// This bypasses Row Level Security (RLS) and should ONLY be used in API routes

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is required");
  }
  return url;
}

function getSupabaseServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");
  }
  return key;
}

// Create admin client with service role key (bypasses RLS)
let _supabaseAdmin: ReturnType<typeof createClient<Database>> | null = null;

export const supabaseAdmin = new Proxy({} as ReturnType<typeof createClient<Database>>, {
  get(target, prop) {
    if (!_supabaseAdmin) {
      _supabaseAdmin = createClient<Database>(
        getSupabaseUrl(),
        getSupabaseServiceRoleKey(),
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );
    }
    return _supabaseAdmin[prop as keyof typeof _supabaseAdmin];
  }
});

// Validation helper
export function validateSupabaseAdmin(): { isValid: boolean; error?: string } {
  try {
    const url = getSupabaseUrl();
    const key = getSupabaseServiceRoleKey();
    
    if (!url) {
      return { isValid: false, error: "NEXT_PUBLIC_SUPABASE_URL is missing" };
    }
    if (!key) {
      return { isValid: false, error: "SUPABASE_SERVICE_ROLE_KEY is missing" };
    }
    if (key.length < 200) {
      return { isValid: false, error: `SUPABASE_SERVICE_ROLE_KEY is too short (${key.length} chars, expected 250+)` };
    }
    
    return { isValid: true };
  } catch (error: any) {
    return { isValid: false, error: error.message };
  }
}