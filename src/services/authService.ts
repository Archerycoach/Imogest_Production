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

// Individual exported functions
export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user ? {
    id: user.id,
    email: user.email || "",
    user_metadata: user.user_metadata,
    created_at: user.created_at
  } : null;
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// Alias for compatibility
export const getSession = getCurrentSession;

export async function signInWithEmail(email: string, password: string): Promise<{ user: AuthUser | null; error: AuthError | null }> {
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
}

export async function signUpWithEmail(email: string, password: string, name?: string): Promise<{ user: AuthUser | null; error: AuthError | null }> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${getURL()}auth/confirm-email`,
        data: name ? { full_name: name } : undefined
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
}

export async function signInWithOAuth(provider: 'google' | 'github' | 'azure'): Promise<{ error: AuthError | null }> {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${getURL()}auth/callback`,
      },
    });

    if (error) {
      return { error: { message: error.message } };
    }

    return { error: null };
  } catch (error) {
    return { 
      error: { message: "An unexpected error occurred during OAuth sign in" } 
    };
  }
}

export async function signInWithGoogle(): Promise<{ error: AuthError | null }> {
  return signInWithOAuth('google');
}

export async function logout(): Promise<{ error: AuthError | null }> {
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
}

// Alias for compatibility
export const signOut = logout;

export async function resetPassword(email: string): Promise<{ error: AuthError | null }> {
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
}

export async function updatePassword(password: string): Promise<{ error: AuthError | null }> {
  try {
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      return { error: { message: error.message } };
    }

    return { error: null };
  } catch (error) {
    return { 
      error: { message: "An unexpected error occurred during password update" } 
    };
  }
}

export async function confirmEmail(token: string, type: 'signup' | 'recovery' | 'email_change' = 'signup'): Promise<{ user: AuthUser | null; error: AuthError | null }> {
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
}

export function onAuthStateChange(callback: (event: string, session: Session | null) => void) {
  return supabase.auth.onAuthStateChange(callback);
}

// Export authService object for backward compatibility
export const authService = {
  getCurrentUser,
  getCurrentSession,
  getSession,
  signInWithEmail,
  signUpWithEmail,
  signInWithOAuth,
  signInWithGoogle,
  logout,
  signOut,
  resetPassword,
  updatePassword,
  confirmEmail,
  onAuthStateChange
};