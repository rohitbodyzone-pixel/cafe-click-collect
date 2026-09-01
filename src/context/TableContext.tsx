import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/src/lib/supabase';

export type CafeTable = { id: string; code: string; name: string; active: boolean };
type Store = { tables: CafeTable[]; loading: boolean; error?: string; addTable: (code: string, name: string) => Promise<void>; updateTable: (id: string, values: Partial<Omit<CafeTable, 'id'>>) => Promise<void>; removeTable: (id: string) => Promise<void> };
type Row = { id: string; code: string; display_name: string; active: boolean };
const Context = createContext<Store | null>(null);
const fromRow = (row: Row): CafeTable => ({ id: row.id, code: row.code, name: row.display_name, active: row.active });

export function TableProvider({ children }: PropsWithChildren) {
  const [tables, setTables] = useState<CafeTable[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string>();
  const fetchTables = useCallback(async () => { if (!supabase) return; const result = await supabase.from('cafe_tables').select('*').order('display_name'); if (result.error) setError(result.error.message); else { setTables((result.data as Row[]).map(fromRow)); setError(undefined); } setLoading(false); }, []);
  useEffect(() => { void fetchTables(); if (!supabase) return; const client = supabase; const channel = client.channel('cafe-tables').on('postgres_changes', { event: '*', schema: 'public', table: 'cafe_tables' }, () => void fetchTables()).subscribe(); return () => { void client.removeChannel(channel); }; }, [fetchTables]);
  const addTable = async (code: string, name: string) => { if (!supabase) throw new Error('Supabase is not configured.'); const { error } = await supabase.from('cafe_tables').insert({ code: code.trim(), display_name: name.trim(), active: true }); if (error) throw new Error(error.message); await fetchTables(); };
  const updateTable = async (id: string, values: Partial<Omit<CafeTable, 'id'>>) => { if (!supabase) throw new Error('Supabase is not configured.'); const payload: Record<string, unknown> = {}; if (values.code !== undefined) payload.code = values.code.trim(); if (values.name !== undefined) payload.display_name = values.name.trim(); if (values.active !== undefined) payload.active = values.active; const { error } = await supabase.from('cafe_tables').update(payload).eq('id', id); if (error) throw new Error(error.message); await fetchTables(); };
  const removeTable = async (id: string) => { if (!supabase) throw new Error('Supabase is not configured.'); const { error } = await supabase.from('cafe_tables').delete().eq('id', id); if (error) throw new Error(error.message); await fetchTables(); };
  const value = useMemo(() => ({ tables, loading, error, addTable, updateTable, removeTable }), [tables, loading, error]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useTables() { const value = useContext(Context); if (!value) throw new Error('useTables must be used inside TableProvider'); return value; }
