import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { DBProfile } from '../types';
import { Globals } from '../lib/globals';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: DBProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<DBProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch or create profile logic
  const fetchProfile = async (currentUser: User) => {
    try {
      if (!supabase) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile in AuthContext:', error);
      } else if (data) {
        setProfile(data as DBProfile);
        Globals.BUSINESS_ID = data.business_id;
      } else {
        // Fallback: If no profile exists yet, create one temporarily so app doesn't crash
        // (The database.ts getBusinessId will do the official creation, but just in case)
        const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newBusinessId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : generateId();
        
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert([{ id: currentUser.id, business_id: newBusinessId, role: 'owner' }])
          .select()
          .single();
          
        if (!insertError && newProfile) {
          setProfile(newProfile as DBProfile);
          Globals.BUSINESS_ID = newProfile.business_id;
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // First, restore any existing session from localStorage before unblocking the UI.
    // This prevents the root from rendering empty when a valid session token exists.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      Globals.USER_ID = session?.user?.id ?? null;
      if (!session?.user) {
        setProfile(null);
        Globals.BUSINESS_ID = null;
      }
      setLoading(false); // Unblock UI only after session is restored
    });

    // Then listen for future auth changes (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      Globals.USER_ID = session?.user?.id ?? null;
      if (!session?.user) {
        setProfile(null);
        Globals.BUSINESS_ID = null;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Isolate Database Queries to AVOID synchronous queue deadlocks!
  useEffect(() => {
    if (user) {
      fetchProfile(user); // No await needed, runs in background without blocking App Load!
    }
  }, [user]);

  const signIn = async (email: string, password: string) => {
    if (!supabase) return { error: { message: 'Supabase not initialized' } as AuthError };

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
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
  };

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
      setProfile(null);
      Globals.BUSINESS_ID = null;
      Globals.USER_ID = null;
    }
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
