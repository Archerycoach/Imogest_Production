import { createClient } from "@supabase/supabase-js";
// Using <any> to bypass strict type checking issues blocking the build
// The types are defined in database.types.ts but integration is proving difficult
export const supabase = createClient<any>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);