import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export interface AuthUser {
  id: string;
  email: string;
  user_metadata?: any;
  created_at?: string;
}

export interface AuthError {
  message: string;
  code?: string;
}

// Dynamic URL Helper
const getURL = () => {
  let url = process?.env?.NEXT_PUBLIC_VERCEL_URL ?? 
           process?.env?.NEXT_PUBLIC_SITE_URL ?? 
           'http://localhost:3000'
  
  // Handle undefined or null url
  if (!url) {
    url = 'http://localhost:3000';
  }
  
  // Ensure url has protocol
  url = url.startsWith('http') ? url : `https://${url}`
  
  // Ensure url ends with slash
  url = url.endsWith('/') ? url : `${url}/`
  
  return url
}

// Get current user
export const getCurrentUser = async (): Promise<AuthUser | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  return user ? {
    id: user.id,
    email: user.email || "",
    user_metadata: user.user_metadata,
    created_at: user.created_at
  } : null;
};

// Get current session
export const getCurrentSession = async (): Promise<Session | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

// Alias for getCurrentSession to match some imports
export const getSession = getCurrentSession;

// Sign up with email and password
export const signUp = async (email: string, password: string, fullName?: string): Promise<{ user: AuthUser | null; error: AuthError | null }> => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${getURL()}auth/confirm-email`,
        data: {
          full_name: fullName
        }
      }
    });

    if (error) {
      return { user: null, error: { message: error.message, code: error.status?.toString() } };
    }

    const authUser = data.user ? {
      id: data.user.id,
      email: data.user.email || "",
      user_metadata: data.user.user_metadata,
      created_at: data.user.created_at
    } : null;

    return { user: authUser, error: null };
  } catch (error) {
    return { 
      user: null, 
      error: { message: "An unexpected error occurred during sign up" } 
    };
  }
};

// Sign in with email and password
export const signIn = async (email: string, password: string): Promise<{ user: AuthUser | null; error: AuthError | null }> => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { user: null, error: { message: error.message, code: error.status?.toString() } };
    }

    const authUser = data.user ? {
      id: data.user.id,
      email: data.user.email || "",
      user_metadata: data.user.user_metadata,
      created_at: data.user.created_at
    } : null;

    return { user: authUser, error: null };
  } catch (error) {
    return { 
      user: null, 
      error: { message: "An unexpected error occurred during sign in" } 
    };
  }
};

// Sign in with Google (OAuth)
export const signInWithGoogle = async () => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${getURL()}auth/callback`
      }
    });
    return { data, error };
  } catch (error) {
    console.error("Error signing in with Google:", error);
    return { data: null, error };
  }
};

// Sign out
export const signOut = async (): Promise<{ error: AuthError | null }> => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return { error: { message: error.message } };
    }

    return { error: null };
  } catch (error) {
    return { 
      error: { message: "An unexpected error occurred during sign out" } 
    };
  }
};

// Reset password
export const resetPassword = async (email: string): Promise<{ error: AuthError | null }> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getURL()}auth/reset-password`,
    });

    if (error) {
      return { error: { message: error.message } };
    }

    return { error: null };
  } catch (error) {
    return { 
      error: { message: "An unexpected error occurred during password reset" } 
    };
  }
};

// Confirm email
export const confirmEmail = async (token: string, type: 'signup' | 'recovery' | 'email_change' = 'signup'): Promise<{ user: AuthUser | null; error: AuthError | null }> => {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: type
    });

    if (error) {
      return { user: null, error: { message: error.message, code: error.status?.toString() } };
    }

    const authUser = data.user ? {
      id: data.user.id,
      email: data.user.email || "",
      user_metadata: data.user.user_metadata,
      created_at: data.user.created_at
    } : null;

    return { user: authUser, error: null };
  } catch (error) {
    return { 
      user: null, 
      error: { message: "An unexpected error occurred during email confirmation" } 
    };
  }
};

// Listen to auth state changes
export const onAuthStateChange = (callback: (event: string, session: Session | null) => void) => {
  return supabase.auth.onAuthStateChange(callback);
};

// Aliases for compatibility
export const signInWithEmail = signIn;
export const signUpWithEmail = signUp;
export const logout = signOut;
export const updatePassword = async (password: string) => {
  return await supabase.auth.updateUser({ password });
};

// Default object export for compatibility
export const authService = {
  getCurrentUser,
  getCurrentSession,
  getSession,
  signUp,
  signUpWithEmail,
  signIn,
  signInWithEmail,
  signInWithGoogle,
  signOut,
  logout,
  resetPassword,
  confirmEmail,
  onAuthStateChange,
  updatePassword
};