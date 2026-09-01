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
import { useRestaurant } from '@/src/context/RestaurantContext';
import { useAdminAuth } from '@/src/context/AdminAuthContext';

export type CafeTable = {
  id: string;
  restaurantId: string;
  code: string;
  name: string;
  active: boolean;
};

type Store = {
  tables: CafeTable[];
  loading: boolean;
  error?: string;
  addTable: (code: string, name: string) => Promise<void>;
  updateTable: (id: string, values: Partial<Omit<CafeTable, 'id' | 'restaurantId'>>) => Promise<void>;
  removeTable: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
};

type Row = {
  id: string;
  restaurant_id: string;
  code: string;
  display_name: string;
  active: boolean;
};

const Context = createContext<Store | null>(null);

const fromRow = (row: Row): CafeTable => ({
  id: row.id,
  restaurantId: row.restaurant_id,
  code: row.code,
  name: row.display_name,
  active: row.active,
});

export function TableProvider({ children }: PropsWithChildren) {
  const { currentRestaurant } = useRestaurant();
  const { staff } = useAdminAuth();
  const targetRestaurantId = staff?.restaurantId || currentRestaurant.id;

  const [tables, setTables] = useState<CafeTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const fetchTables = useCallback(async () => {
    if (!supabase) return;
    const result = await supabase
      .from('cafe_tables')
      .select('*')
      .eq('restaurant_id', targetRestaurantId)
      .order('display_name');

    if (result.error) {
      setError(result.error.message);
    } else {
      setTables((result.data as Row[]).map(fromRow));
      setError(undefined);
    }
    setLoading(false);
  }, [targetRestaurantId]);

  useEffect(() => {
    setLoading(true);
    void fetchTables();
    if (!supabase) return;
    const client = supabase;
    const channel = client
      .channel(`restaurant-tables-${targetRestaurantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cafe_tables',
          filter: `restaurant_id=eq.${targetRestaurantId}`,
        },
        () => void fetchTables(),
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [fetchTables, targetRestaurantId]);

  const addTable = async (code: string, name: string) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { error: insErr } = await supabase.from('cafe_tables').insert({
      restaurant_id: targetRestaurantId,
      code: code.trim(),
      display_name: name.trim(),
      active: true,
    });
    if (insErr) throw new Error(insErr.message);
    await fetchTables();
  };

  const updateTable = async (
    id: string,
    values: Partial<Omit<CafeTable, 'id' | 'restaurantId'>>,
  ) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const payload: Record<string, unknown> = {};
    if (values.code !== undefined) payload.code = values.code.trim();
    if (values.name !== undefined) payload.display_name = values.name.trim();
    if (values.active !== undefined) payload.active = values.active;
    const { error: updErr } = await supabase
      .from('cafe_tables')
      .update(payload)
      .eq('id', id);
    if (updErr) throw new Error(updErr.message);
    await fetchTables();
  };

  const removeTable = async (id: string) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { error: delErr } = await supabase
      .from('cafe_tables')
      .delete()
      .eq('id', id);
    if (delErr) throw new Error(delErr.message);
    await fetchTables();
  };

  const value = useMemo(
    () => ({
      tables,
      loading,
      error,
      addTable,
      updateTable,
      removeTable,
      refresh: fetchTables,
    }),
    [tables, loading, error, fetchTables, targetRestaurantId],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useTables() {
  const value = useContext(Context);
  if (!value) throw new Error('useTables must be used inside TableProvider');
  return value;
}
