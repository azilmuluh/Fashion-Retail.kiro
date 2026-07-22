/**
 * Authentication Context
 * Manages user authentication state and provides auth methods
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Retailer } from '@fashion-retail/shared';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  retailer: Retailer | null;
  loading: boolean;
  signUp: (email: string, password: string, metadata: {
    business_name: string;
    phone_number: string;
    whatsapp_number: string;
  }) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updateProfile: (updates: Partial<Retailer>) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [retailer, setRetailer] = useState<Retailer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadRetailerProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await loadRetailerProfile(session.user.id);
        } else {
          setRetailer(null);
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function loadRetailerProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('retailers')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setRetailer(data);
    } catch (error) {
      console.error('Error loading retailer profile:', error);
    } finally {
      setLoading(false);
    }
  }

  async function signUp(
    email: string,
    password: string,
    metadata: {
      business_name: string;
      phone_number: string;
      whatsapp_number: string;
    }
  ) {
    try {
      console.log('AuthContext signUp called with:', {
        email,
        password: '***',
        metadata,
      });
      
      console.log('Calling supabase.auth.signUp...');
      const result = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });
      
      console.log('Supabase signUp result:', {
        error: result.error,
        data: result.data,
      });

      if (result.error) throw result.error;
      return { error: null };
    } catch (error) {
      console.error('Sign up error in AuthContext:', error);
      return { error: error as Error };
    }
  }

  async function signIn(email: string, password: string) {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error: error as Error };
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setRetailer(null);
  }

  async function resetPassword(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'fashion-retail://reset-password',
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Reset password error:', error);
      return { error: error as Error };
    }
  }

  async function updateProfile(updates: Partial<Retailer>) {
    if (!retailer) {
      return { error: new Error('No retailer profile loaded') };
    }

    try {
      const { error } = await supabase
        .from('retailers')
        .update(updates)
        .eq('id', retailer.id);

      if (error) throw error;

      // Reload profile
      await loadRetailerProfile(retailer.id);
      return { error: null };
    } catch (error) {
      console.error('Update profile error:', error);
      return { error: error as Error };
    }
  }

  const value = {
    session,
    user,
    retailer,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
