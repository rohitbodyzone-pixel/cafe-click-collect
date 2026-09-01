import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/src/lib/supabase';

export type PickupSettings = {
  openingTime: string; closingTime: string; averagePrepMinutes: number;
  slotIntervalMinutes: number; maxOrdersPerSlot: number; timezone: string;
};
type Store = { settings?: PickupSettings; loading: boolean; error?: string; saveSettings: (settings: PickupSettings) => Promise<void> };
type SettingsRow = { opening_time: string; closing_time: string; average_prep_minutes: number; slot_interval_minutes: number; max_orders_per_slot: number; timezone: string };
const Context = createContext<Store | null>(null);
const mapRow = (row: SettingsRow): PickupSettings => ({ openingTime: row.opening_time.slice(0, 5), closingTime: row.closing_time.slice(0, 5), averagePrepMinutes: row.average_prep_minutes, slotIntervalMinutes: row.slot_interval_minutes, maxOrdersPerSlot: row.max_orders_per_slot, timezone: row.timezone });

export function PickupSettingsProvider({ children }: PropsWithChildren) {
  const [settings, setSettings] = useState<PickupSettings>(); const [loading, setLoading] = useState(true); const [error, setError] = useState<string>();
  const fetchSettings = useCallback(async () => {
    if (!supabase) { setError('Supabase is not configured.'); setLoading(false); return; }
    const result = await supabase.from('cafe_settings').select('*').eq('id', 1).single();
    if (result.error) setError(result.error.message); else { setSettings(mapRow(result.data as SettingsRow)); setError(undefined); }
    setLoading(false);
  }, []);
  useEffect(() => {
    void fetchSettings(); if (!supabase) return; const client = supabase;
    const channel = client.channel('pickup-settings').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'cafe_settings' }, () => void fetchSettings()).subscribe();
    return () => { void client.removeChannel(channel); };
  }, [fetchSettings]);
  const saveSettings = async (next: PickupSettings) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const result = await supabase.from('cafe_settings').update({ opening_time: next.openingTime, closing_time: next.closingTime, average_prep_minutes: next.averagePrepMinutes, slot_interval_minutes: next.slotIntervalMinutes, max_orders_per_slot: next.maxOrdersPerSlot, timezone: next.timezone }).eq('id', 1);
    if (result.error) throw new Error(result.error.message); setSettings(next);
  };
  const value = useMemo(() => ({ settings, loading, error, saveSettings }), [settings, loading, error]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function usePickupSettings() { const value = useContext(Context); if (!value) throw new Error('usePickupSettings must be used inside PickupSettingsProvider'); return value; }
