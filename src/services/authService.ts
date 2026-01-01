import { supabase } from "@/integrations/supabase/client";

/**
 * Get the dynamic redirect URL based on the current environment
 * Fixes Firefox localhost connection refused error
 */
const getRedirectUrl = (): string => {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
};

// Sign Up
export const signUpWithEmail = async (email: string, password: string, fullName: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
      emailRedirectTo: `${getRedirectUrl()}/login`,
    },
  });

  if (error) throw error;
  return data;
};

// Sign In
export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
};

// Google Auth
export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${getRedirectUrl()}/api/google-calendar/callback`, // Changed to point to callback directly
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) throw error;
  return data;
};

// Sign Out
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

// Alias for signOut (compatibility)
export const logout = signOut;

// Password Management
export const resetPassword = async (email: string) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getRedirectUrl()}/reset-password`,
  });

  if (error) throw error;
  return data;
};

export const updatePassword = async (newPassword: string) => {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) throw error;
  return data;
};

// Session & User
export const getSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
};

export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error && error.name !== 'AuthSessionMissingError') {
    // Only throw real errors, return null if just no session
    console.error("Error getting user:", error);
  }
  return data.user;
};

// Auth State Listener
export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
  return supabase.auth.onAuthStateChange(callback);
};

// Export default object for backward compatibility with some imports
const authService = {
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle,
  signOut,
  logout,
  resetPassword,
  updatePassword,
  getSession,
  getCurrentUser,
  onAuthStateChange,
};

export default authService;