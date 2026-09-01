import { Session } from '@supabase/supabase-js';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/src/lib/supabase';

export type StaffMember = { userId: string; email: string; displayName: string; role: 'admin' | 'staff' };
type Store = {
  session: Session | null;
  staff?: StaffMember;
  loading: boolean;
  error?: string;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Context = createContext<Store | null>(null);

export function AdminAuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [staff, setStaff] = useState<StaffMember>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const loadStaff = useCallback(async (current: Session | null) => {
    setSession(current);
    if (!supabase || !current?.user.email) { setStaff(undefined); setLoading(false); return; }
    const result = await supabase.from('cafe_staff').select('*').eq('user_id', current.user.id).maybeSingle();
    if (result.error) { setError(result.error.message); setStaff(undefined); }
    else { setStaff(result.data ? { userId: result.data.user_id, email: result.data.email, displayName: result.data.display_name, role: result.data.role } : undefined); setError(undefined); }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    void supabase.auth.getSession().then(({ data }) => loadStaff(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => { setLoading(true); void loadStaff(next); });
    return () => data.subscription.unsubscribe();
  }, [loadStaff]);

  const signIn = async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const result = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (result.error) throw new Error(result.error.message);
    await loadStaff(result.data.session);
  };
  const signOut = async () => { if (supabase) await supabase.auth.signOut(); setStaff(undefined); setSession(null); };
  const refresh = async () => { if (supabase) await loadStaff((await supabase.auth.getSession()).data.session); };
  const value = useMemo(() => ({ session, staff, loading, error, signIn, signOut, refresh }), [session, staff, loading, error, loadStaff]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAdminAuth() { const value = useContext(Context); if (!value) throw new Error('useAdminAuth must be used inside AdminAuthProvider'); return value; }
