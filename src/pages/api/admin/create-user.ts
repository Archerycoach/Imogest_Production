import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = req.headers.authorization?.split(" ")[1];
  
  if (!token) {
    console.error("[API] No authorization token provided");
    return res.status(401).json({ error: "Não autorizado: Token em falta" });
  }

  // Standard client to verify the user's token
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  );

  // Admin client to perform privileged actions
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  try {
    // 1. Verify the user calling this API with their token
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("[API] Auth validation failed:", authError);
      return res.status(401).json({ error: "Não autorizado: Token inválido" });
    }

    console.log("[API] User authenticated:", user.id);

    // 2. Check role in profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("[API] Profile fetch error:", profileError);
      return res.status(500).json({ error: "Erro ao verificar permissões" });
    }

    if (profile?.role !== "admin") {
      console.error("[API] Permission denied. User role:", profile?.role);
      return res.status(403).json({ error: "Não autorizado: Requer privilégios de administrador" });
    }

    console.log("[API] Admin verified. Creating user...");

    const { email, password, fullName, role, isActive, teamLeadId } = req.body;

    // Validate required fields
    if (!email || !password || !fullName || !role) {
      return res.status(400).json({ error: "Campos obrigatórios em falta" });
    }

    console.log("[API] Creating user:", { email, role, teamLeadId });

    // 3. Create user in Supabase Auth using admin client
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    });

    if (createError) {
      console.error("[API] Create user error:", createError);
      return res.status(400).json({ error: createError.message });
    }

    if (!newUser.user) {
      return res.status(500).json({ error: "Falha ao criar utilizador Auth" });
    }

    console.log("[API] User created in auth:", newUser.user.id);

    // 4. Update profile with role and other details
    const { error: profileUpdateError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: newUser.user.id,
        email: email,
        full_name: fullName,
        role: role,
        is_active: isActive !== undefined ? isActive : true,
        team_lead_id: teamLeadId || null,
        updated_at: new Date().toISOString()
      });

    if (profileUpdateError) {
      console.error("[API] Profile update error:", profileUpdateError);
      // Don't fail the request if auth user was created, but warn
      return res.status(200).json({ 
        success: true, 
        warning: "Utilizador criado, mas houve erro ao atualizar perfil: " + profileUpdateError.message,
        user: newUser.user
      });
    }

    console.log("[API] Profile updated successfully");

    return res.status(200).json({ success: true, user: newUser.user });

  } catch (error: any) {
    console.error("[API] Unexpected error:", error);
    return res.status(500).json({ error: "Erro interno do servidor: " + error.message });
  }
}