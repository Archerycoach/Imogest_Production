import { createServerClient, serialize } from "@supabase/ssr";
import { type NextApiRequest, type NextApiResponse } from "next";
import type { Database } from "@/integrations/supabase/types";

export function createPagesServerClient({
  req,
  res,
}: {
  req: NextApiRequest;
  res: NextApiResponse;
}) {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return Object.keys(req.cookies).map((name) => ({
            name,
            value: req.cookies[name] || "",
          }));
        },
        setAll(cookiesToSet) {
          try {
            const cookies = cookiesToSet.map(({ name, value, options }) =>
              serialize(name, value, options)
            );
            res.setHeader("Set-Cookie", cookies);
          } catch (error) {
            console.error("Error setting cookies:", error);
          }
        },
      },
    }
  );
}