import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { getUserWithRetry, getSessionWithRetry } from "@/lib/supabaseRetry";

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

// Get current user with retry logic
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const userData = await getUserWithRetry(supabase, {
      maxRetries: 3,
      delayMs: 500,
    });
    return userData?.user || null;
  } catch (error) {
    console.error("[Auth] Failed to get current user after retries:", error);
    return null;
  }
};

// Check if user is authenticated with retry logic
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const userData = await getUserWithRetry(supabase, {
      maxRetries: 2,
      delayMs: 500,
    });
    return !!userData?.user;
  } catch (error) {
    console.error("[Auth] Failed to check authentication:", error);
    return false;
  }
};

// Get session with retry logic
export const getSession = async () => {
  try {
    const sessionData = await getSessionWithRetry(supabase, {
      maxRetries: 2,
      delayMs: 500,
    });
    return sessionData?.session || null;
  } catch (error) {
    console.error("[Auth] Failed to get session:", error);
    return null;
  }
};

export const getCurrentSession = getSession; // Alias for backward compatibility

// Sign up with email and password
export const signUpWithEmail = async (email: string, password: string, userData?: { name?: string } | string): Promise<{ user: AuthUser | null; error: AuthError | null }> => {
  try {
    // Handle overload where 3rd arg is string (legacy name) or object
    const metadata = typeof userData === 'string' 
      ? { full_name: userData } 
      : userData || {};

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${getURL()}auth/confirm-email`,
        data: metadata
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
  } catch (error: any) {
    return { 
      user: null, 
      error: { message: error.message || "An unexpected error occurred during sign up" } 
    };
  }
};

// Sign in with email and password
export const signInWithEmail = async (email: string, password: string): Promise<{ user: AuthUser | null; error: AuthError | null }> => {
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
  } catch (error: any) {
    return { 
      user: null, 
      error: { message: error.message || "An unexpected error occurred during sign in" } 
    };
  }
};

// Sign in with Google
export const signInWithGoogle = async (): Promise<{ error: AuthError | null }> => {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${getURL()}auth/callback`
      }
    });

    if (error) {
      return { error: { message: error.message } };
    }

    return { error: null };
  } catch (error: any) {
    return { 
      error: { message: error.message || "An unexpected error occurred during Google sign in" } 
    };
  }
};

// Sign out
export const logout = async (): Promise<{ error: AuthError | null }> => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return { error: { message: error.message } };
    }

    return { error: null };
  } catch (error: any) {
    return { 
      error: { message: "An unexpected error occurred during sign out" } 
    };
  }
};

export const signOut = logout; // Alias

// Update password
export const updatePassword = async (password: string): Promise<{ error: AuthError | null }> => {
  try {
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      return { error: { message: error.message } };
    }

    return { error: null };
  } catch (error: any) {
    return { 
      error: { message: "An unexpected error occurred during password update" } 
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
  } catch (error: any) {
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
      type: type as any
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
  } catch (error: any) {
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

// Default export object for backward compatibility if any
export const authService = {
  getCurrentUser,
  getCurrentSession,
  getSession,
  signUp: signUpWithEmail,
  signIn: signInWithEmail,
  signInWithGoogle,
  signOut,
  logout,
  resetPassword,
  updatePassword,
  confirmEmail,
  onAuthStateChange
};