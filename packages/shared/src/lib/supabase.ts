/**
 * Supabase Client Configuration
 * Creates typed Supabase clients for web and React Native
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

export type SupabaseClient = ReturnType<typeof createClient<Database>>;

/**
 * Create Supabase client (Web/React Native)
 */
export function createSupabaseClient(
  supabaseUrl: string,
  supabaseAnonKey: string,
  options?: {
    auth?: {
      storage?: any;
      autoRefreshToken?: boolean;
      persistSession?: boolean;
      detectSessionInUrl?: boolean;
    };
  }
): SupabaseClient {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      ...options?.auth,
    },
  });
}

/**
 * Create Supabase admin client (Server-side only)
 * Uses service role key for bypassing RLS
 */
export function createSupabaseAdminClient(
  supabaseUrl: string,
  supabaseServiceRoleKey: string
): SupabaseClient {
  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
