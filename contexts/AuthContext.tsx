import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, isDemoMode } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  isDemoMode: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Demo user for localStorage mode
const DEMO_USER: User = {
  id: 'demo-user-001',
  email: 'demo@neron.local',
  aud: 'authenticated',
  role: 'authenticated',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  app_metadata: {},
  user_metadata: { full_name: 'Usuario Demo' },
};

const DEMO_SESSION_KEY = 'neron_demo_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemoMode) {
      // DEMO MODE: Check sessionStorage for existing session
      const demoSession = sessionStorage.getItem(DEMO_SESSION_KEY);
      if (demoSession) {
        setUser(DEMO_USER);
        setSession({ user: DEMO_USER } as Session);
      }
      setLoading(false);
    } else {
      // SUPABASE MODE: Original logic
      if (!supabase) {
        setLoading(false);
        return;
      }

      // Get initial session
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      });

      // Listen for auth changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      });

      return () => subscription.unsubscribe();
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    if (isDemoMode) {
      // DEMO MODE: Accept any credentials and create demo session
      console.log('🎭 Demo Mode: Sign in accepted with email:', email);
      setUser(DEMO_USER);
      setSession({ user: DEMO_USER } as Session);
      sessionStorage.setItem(DEMO_SESSION_KEY, 'true');
      return { error: null };
    } else {
      // SUPABASE MODE: Original logic
      if (!supabase) return { error: { message: 'Supabase not initialized' } as AuthError };

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    if (isDemoMode) {
      // DEMO MODE: Accept registration and create demo session
      console.log('🎭 Demo Mode: Sign up accepted with email:', email, 'name:', fullName);
      setUser(DEMO_USER);
      setSession({ user: DEMO_USER } as Session);
      sessionStorage.setItem(DEMO_SESSION_KEY, 'true');
      return { error: null };
    } else {
      // SUPABASE MODE: Original logic
      if (!supabase) return { error: { message: 'Supabase not initialized' } as AuthError };

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
      return { error };
    }
  };

  const signOut = async () => {
    if (isDemoMode) {
      // DEMO MODE: Clear demo session
      console.log('🎭 Demo Mode: Sign out');
      setUser(null);
      setSession(null);
      sessionStorage.removeItem(DEMO_SESSION_KEY);
    } else {
      // SUPABASE MODE: Original logic
      if (supabase) {
        await supabase.auth.signOut();
      }
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    isDemoMode,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
