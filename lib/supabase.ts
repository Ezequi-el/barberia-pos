import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isDemoMode = !supabaseUrl || !supabaseAnonKey;

if (isDemoMode) {
  console.warn('Running in DEMO MODE: Missing Supabase environment variables.');
}

// LocalStorage Helper for Mock Data
const getLocalData = (key: string) => {
  const data = localStorage.getItem(`demo_${key}`);
  return data ? JSON.parse(data) : [];
};

const saveLocalData = (key: string, data: any[]) => {
  localStorage.setItem(`demo_${key}`, JSON.stringify(data));
};

export const supabase = isDemoMode
  ? {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
      signInWithPassword: async () => ({ data: {}, error: null }),
      signUp: async () => ({ data: {}, error: null }),
      signOut: async () => ({ error: null }),
      getUser: async () => ({ data: { user: { id: 'demo-user-id' } }, error: null })
    },
    from: (table: string) => {
      const buildQuery = (data: any[]): any => {
        const query: any = Promise.resolve({ data, error: null });
        query.select = () => buildQuery(data);
        query.eq = (col: string, val: any) => buildQuery(data.filter((i: any) => i[col] === val));
        query.order = () => buildQuery(data);
        query.limit = (n: number) => buildQuery(data.slice(0, n));
        query.single = () => Promise.resolve({ data: data[0] || null, error: null });
        query.insert = (rows: any[]) => {
          const all = getLocalData(table);
          const newRows = rows.map(r => ({ ...r, id: r.id || crypto.randomUUID(), created_at: new Date().toISOString() }));
          saveLocalData(table, [...all, ...newRows]);
          return buildQuery(newRows);
        };
        query.update = (updates: any) => {
          const q: any = Promise.resolve({ error: null });
          q.eq = (col: string, val: any) => {
            const all = getLocalData(table);
            const updated = all.map((i: any) => i[col] === val ? { ...i, ...updates } : i);
            saveLocalData(table, updated);
            return Promise.resolve({ error: null });
          };
          return q;
        };
        query.delete = () => {
          const q: any = Promise.resolve({ error: null });
          q.eq = (col: string, val: any) => {
            const all = getLocalData(table);
            const filtered = all.filter((i: any) => i[col] !== val);
            saveLocalData(table, filtered);
            return Promise.resolve({ error: null });
          };
          return q;
        };
        return query;
      };
      return buildQuery(getLocalData(table));
    }
  } as any
  : createClient(supabaseUrl, supabaseAnonKey);
