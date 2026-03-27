import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Check if running in Demo Mode (no Supabase credentials)
export const isDemoMode = !supabaseUrl || !supabaseAnonKey;

// Only create Supabase client if credentials exist
export const supabase = isDemoMode 
  ? null 
  : createClient(supabaseUrl, supabaseAnonKey);

// Admin client (Service Role Key) — solo para operaciones de gestión de usuarios.
// NOTA: Solo usar en desarrollo local. En producción, mover a Edge Functions.
export const supabaseAdmin = isDemoMode || !supabaseServiceKey
  ? null
  : createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
