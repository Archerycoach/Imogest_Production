import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

const getRedirectURL = (path = "") => {
  let url =
    process?.env?.NEXT_PUBLIC_SITE_URL ?? // Set this to your site URL in production env.
    process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel.
    "http://localhost:3000";

  // Make sure to include `https://` when not localhost.
  url = url.includes("http") ? url : `https://${url}`;
  // Make sure to include a trailing `/`.
  url = url.charAt(url.length - 1) === "/" ? url : `${url}/`;

  return `${url}${path.replace(/^\//, "")}`;
};

// Sign up with email and password (NO email confirmation required)
export const signUpWithEmail = async (email: string, password: string, fullName: string) => {
  try {
    console.log("🔵 [AuthService] Starting signup process...");
    console.log("🔵 [AuthService] Email:", email);
    console.log("🔵 [AuthService] Full name:", fullName);
    console.log("🔵 [AuthService] Environment:", process.env.NODE_ENV);
    
    // Step 1: Create user account
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    console.log("🔵 [AuthService] Signup response:", {
      hasData: !!signUpData,
      hasUser: !!signUpData?.user,
      hasSession: !!signUpData?.session,
      error: signUpError,
    });

    if (signUpError) {
      console.error("❌ [AuthService] Signup error:", signUpError);
      throw signUpError;
    }

    if (!signUpData.user) {
      console.error("❌ [AuthService] No user returned from signup");
      throw new Error("Falha ao criar utilizador. Por favor, tente novamente.");
    }

    console.log("✅ [AuthService] Signup successful");
    console.log("🔵 [AuthService] User ID:", signUpData.user.id);
    console.log("🔵 [AuthService] Email confirmed at:", signUpData.user.email_confirmed_at);

    // Step 2: Create profile
    console.log("🔵 [AuthService] Creating profile...");
    
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: signUpData.user.id,
        email: email,
        full_name: fullName,
        role: "agent",
      });

    if (profileError) {
      console.error("❌ [AuthService] Profile creation error:", profileError);
      console.error("❌ [AuthService] Profile error details:", {
        code: profileError.code,
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
      });
      
      // Check if profile already exists
      if (profileError.code === "23505") {
        console.log("⚠️ [AuthService] Profile already exists, continuing...");
      } else {
        throw new Error(`Erro ao criar perfil: ${profileError.message}`);
      }
    } else {
      console.log("✅ [AuthService] Profile created successfully");
    }

    return signUpData.user;
  } catch (error: any) {
    console.error("❌ [AuthService] Error in signUpWithEmail:", error);
    console.error("❌ [AuthService] Error details:", {
      message: error?.message,
      status: error?.status,
      code: error?.code,
      stack: error?.stack,
    });
    throw error;
  }
};

// Sign in with email and password
export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return { data: null, error };
  return { data, error: null };
};

// Sign in with Google
export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/dashboard`,
    },
  });

  if (error) return { data: null, error };
  return { data, error: null };
};

// Sign out
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

/**
 * Sign out the current user
 */
export const logout = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    throw new Error(`Erro ao fazer logout: ${error.message}`);
  }
  
  // Clear any local storage data
  if (typeof window !== "undefined") {
    localStorage.clear();
  }
};

// Get current session
export const getSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error("Session error:", error);
      return null;
    }
    
    return session;
  } catch (error) {
    console.error("Error getting session:", error);
    return null;
  }
};

// Get current user
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.error("Error getting user:", error);
    return null;
  }
};

// Validate and refresh session if needed
export const validateSession = async (): Promise<boolean> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      console.error("No valid session:", error);
      return false;
    }

    // Check if token is about to expire (within 5 minutes)
    const expiresAt = session.expires_at || 0;
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = expiresAt - now;

    if (timeUntilExpiry < 300) {
      // Token expires in less than 5 minutes - refresh it
      console.log("Token expiring soon, refreshing...");
      const { data: { session: newSession }, error: refreshError } = 
        await supabase.auth.refreshSession();
      
      if (refreshError || !newSession) {
        console.error("Failed to refresh session:", refreshError);
        return false;
      }
      
      console.log("Session refreshed successfully");
    }

    return true;
  } catch (error) {
    console.error("Error validating session:", error);
    return false;
  }
};

// Reset password (send email)
export const resetPassword = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });
  if (error) throw error;
};

// Update password (logged in user)
export const updatePassword = async (password: string) => {
  const { error } = await supabase.auth.updateUser({
    password,
  });
  if (error) throw error;
};

// Get user profile including role
export const getUserProfile = async () => {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  return data;
};

// Export default object for backward compatibility if needed, 
// though named exports are preferred now.
export const authService = {
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle,
  signOut,
  logout,
  getSession,
  getCurrentUser,
  validateSession,
  resetPassword,
  updatePassword,
  getUserProfile
};