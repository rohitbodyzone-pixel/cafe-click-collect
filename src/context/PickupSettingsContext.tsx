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

export type PickupSettings = {
  openingTime: string;
  closingTime: string;
  averagePrepMinutes: number;
  slotIntervalMinutes: number;
  maxOrdersPerSlot: number;
  timezone: string;
};

type Store = {
  settings?: PickupSettings;
  loading: boolean;
  error?: string;
  saveSettings: (settings: PickupSettings) => Promise<void>;
  refresh: () => Promise<void>;
};

const Context = createContext<Store | null>(null);

export function PickupSettingsProvider({ children }: PropsWithChildren) {
  const { currentRestaurant, updateRestaurantProfile } = useRestaurant();
  const { staff } = useAdminAuth();
  const targetRestaurantId = staff?.restaurantId || currentRestaurant.id;

  const [settings, setSettings] = useState<PickupSettings>({
    openingTime: currentRestaurant.openingTime,
    closingTime: currentRestaurant.closingTime,
    averagePrepMinutes: currentRestaurant.averagePrepMinutes,
    slotIntervalMinutes: currentRestaurant.slotIntervalMinutes,
    maxOrdersPerSlot: currentRestaurant.maxOrdersPerSlot,
    timezone: currentRestaurant.timezone,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const fetchSettings = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const result = await supabase
      .from('restaurants')
      .select('opening_time, closing_time, average_prep_minutes, slot_interval_minutes, max_orders_per_slot, timezone')
      .eq('id', targetRestaurantId)
      .maybeSingle();

    if (result.error) {
      setError(result.error.message);
    } else if (result.data) {
      setSettings({
        openingTime: (result.data.opening_time || '07:00').slice(0, 5),
        closingTime: (result.data.closing_time || '16:00').slice(0, 5),
        averagePrepMinutes: result.data.average_prep_minutes,
        slotIntervalMinutes: result.data.slot_interval_minutes,
        maxOrdersPerSlot: result.data.max_orders_per_slot,
        timezone: result.data.timezone || 'Pacific/Auckland',
      });
      setError(undefined);
    }
    setLoading(false);
  }, [targetRestaurantId]);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const saveSettings = async (next: PickupSettings) => {
    await updateRestaurantProfile(targetRestaurantId, {
      openingTime: next.openingTime,
      closingTime: next.closingTime,
      averagePrepMinutes: next.averagePrepMinutes,
      slotIntervalMinutes: next.slotIntervalMinutes,
      maxOrdersPerSlot: next.maxOrdersPerSlot,
      timezone: next.timezone,
    });
    setSettings(next);
  };

  const value = useMemo(
    () => ({
      settings,
      loading,
      error,
      saveSettings,
      refresh: fetchSettings,
    }),
    [settings, loading, error, fetchSettings],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function usePickupSettings() {
  const value = useContext(Context);
  if (!value) throw new Error('usePickupSettings must be used inside PickupSettingsProvider');
  return value;
}
