import { Session } from '@supabase/supabase-js';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { supabase } from '@/src/lib/supabase';

export type StaffRole =
  | 'super_admin'
  | 'owner'
  | 'manager'
  | 'counter'
  | 'kitchen'
  | 'staff'
  | 'admin';

export type StaffMember = {
  id?: string;
  userId: string;
  email: string;
  displayName: string;
  role: StaffRole;
  restaurantId?: string;
};

type Store = {
  session: Session | null;
  staff?: StaffMember;
  loading: boolean;
  error?: string;
  isSuperAdmin: boolean;
  isOwnerOrManager: boolean;
  isKitchen: boolean;
  isCounter: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  claimSuperAdmin: () => Promise<void>;
};

const Context = createContext<Store | null>(null);

export function AdminAuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [staff, setStaff] = useState<StaffMember>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const loadStaff = useCallback(async (current: Session | null) => {
    setSession(current);
    if (!supabase || !current?.user) {
      setStaff(undefined);
      setLoading(false);
      return;
    }

    // First try secure get_my_staff_profile RPC
    try {
      const { data: rpcStaff } = await supabase.rpc('get_my_staff_profile');
      if (rpcStaff) {
        setStaff({
          id: rpcStaff.id,
          userId: rpcStaff.user_id || current.user.id,
          email: rpcStaff.email,
          displayName: rpcStaff.display_name,
          role: rpcStaff.role,
          restaurantId: rpcStaff.restaurant_id || undefined,
        });
        setError(undefined);
        setLoading(false);
        return;
      }
    } catch {
      // Continue to direct query fallback
    }

    // Direct query fallback on restaurant_staff table
    const result = await supabase
      .from('restaurant_staff')
      .select('*')
      .eq('user_id', current.user.id)
      .maybeSingle();

    if (result.error && !result.error.message.includes('relation "public.restaurant_staff" does not exist')) {
      setError(result.error.message);
      setStaff(undefined);
    } else if (result.data) {
      setStaff({
        id: result.data.id,
        userId: result.data.user_id,
        email: result.data.email,
        displayName: result.data.display_name,
        role: result.data.role,
        restaurantId: result.data.restaurant_id || undefined,
      });
      setError(undefined);
    } else {
      // Fallback check by email in restaurant_staff
      const emailResult = await supabase
        .from('restaurant_staff')
        .select('*')
        .eq('email', current.user.email?.toLowerCase().trim() || '')
        .maybeSingle();

      if (emailResult.data) {
        setStaff({
          id: emailResult.data.id,
          userId: current.user.id,
          email: emailResult.data.email,
          displayName: emailResult.data.display_name,
          role: emailResult.data.role,
          restaurantId: emailResult.data.restaurant_id || undefined,
        });
        setError(undefined);
      } else {
        // Fallback to legacy cafe_staff table if needed
        const legacyResult = await supabase
          .from('cafe_staff')
          .select('*')
          .eq('user_id', current.user.id)
          .maybeSingle();

        if (legacyResult.data) {
          setStaff({
            userId: legacyResult.data.user_id,
            email: legacyResult.data.email,
            displayName: legacyResult.data.display_name,
            role: legacyResult.data.role === 'admin' ? 'owner' : 'staff',
            restaurantId: 'c0000000-0000-0000-0000-000000000001',
          });
          setError(undefined);
        } else {
          setStaff(undefined);
        }
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    void supabase.auth.getSession().then(({ data }) => loadStaff(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setLoading(true);
      void loadStaff(next);
    });
    return () => data.subscription.unsubscribe();
  }, [loadStaff]);

  const signIn = async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const result = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (result.error) throw new Error(result.error.message);
    await loadStaff(result.data.session);
  };

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setStaff(undefined);
    setSession(null);
  };

  const refresh = async () => {
    if (supabase) await loadStaff((await supabase.auth.getSession()).data.session);
  };

  const claimSuperAdmin = async () => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { error: claimError } = await supabase.rpc('claim_first_super_admin');
    if (claimError) throw new Error(claimError.message);
    await refresh();
  };

  const isSuperAdmin = staff?.role === 'super_admin';
  const isOwnerOrManager = isSuperAdmin || staff?.role === 'owner' || staff?.role === 'manager' || staff?.role === 'admin';
  const isKitchen = staff?.role === 'kitchen';
  const isCounter = staff?.role === 'counter';

  const value = useMemo(
    () => ({
      session,
      staff,
      loading,
      error,
      isSuperAdmin,
      isOwnerOrManager,
      isKitchen,
      isCounter,
      signIn,
      signOut,
      refresh,
      claimSuperAdmin,
    }),
    [session, staff, loading, error, isSuperAdmin, isOwnerOrManager, isKitchen, isCounter, loadStaff],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAdminAuth() {
  const value = useContext(Context);
  if (!value) throw new Error('useAdminAuth must be used inside AdminAuthProvider');
  return value;
}
