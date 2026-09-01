import AsyncStorage from '@react-native-async-storage/async-storage';
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

const KEY = 'cafe-loyalty-customer-key-v2';

export type LoyaltySettings = {
  pointsPerDollar: number;
  coffeeGoal: number;
  freeCoffeeMaxCents: number;
  enabled: boolean;
};

export type PromoCode = {
  id: string;
  restaurantId: string;
  code: string;
  description: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  minimumSpend: number;
  expiresAt?: string;
  enabled: boolean;
};

export type LoyaltyBalance = {
  points: number;
  coffeeStamps: number;
  freeCoffees: number;
};

type Store = {
  customerKey: string;
  settings: LoyaltySettings;
  promos: PromoCode[];
  balance: LoyaltyBalance;
  loading: boolean;
  refresh: () => Promise<void>;
  saveSettings: (value: LoyaltySettings) => Promise<void>;
  savePromo: (promo: Omit<PromoCode, 'id' | 'restaurantId'> & { id?: string }) => Promise<void>;
  togglePromo: (id: string, enabled: boolean) => Promise<void>;
};

const Context = createContext<Store | null>(null);

const defaults: LoyaltySettings = {
  pointsPerDollar: 1,
  coffeeGoal: 4,
  freeCoffeeMaxCents: 1000,
  enabled: true,
};

const makeKey = () =>
  `LOY-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`}`;

export function LoyaltyProvider({ children }: PropsWithChildren) {
  const { currentRestaurant } = useRestaurant();
  const { staff } = useAdminAuth();
  const targetRestaurantId = staff?.restaurantId || currentRestaurant.id;

  const [customerKey, setCustomerKey] = useState('');
  const [settings, setSettings] = useState(defaults);
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [balance, setBalance] = useState<LoyaltyBalance>({
    points: 0,
    coffeeStamps: 0,
    freeCoffees: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void AsyncStorage.getItem(KEY).then((value) => {
      const key = value || makeKey();
      if (!value) void AsyncStorage.setItem(KEY, key);
      setCustomerKey(key);
    });
  }, []);

  const refresh = useCallback(async () => {
    if (!supabase || !customerKey) return;
    const [s, p, b] = await Promise.all([
      supabase
        .from('loyalty_settings')
        .select('*')
        .eq('restaurant_id', targetRestaurantId)
        .maybeSingle(),
      supabase
        .from('promo_codes')
        .select('*')
        .eq('restaurant_id', targetRestaurantId)
        .order('code'),
      supabase.rpc('get_customer_loyalty', {
        p_customer_key: customerKey,
        p_restaurant_id: targetRestaurantId,
      }),
    ]);

    if (s.data) {
      setSettings({
        pointsPerDollar: Number(s.data.points_per_dollar),
        coffeeGoal: s.data.coffee_goal,
        freeCoffeeMaxCents: s.data.free_coffee_max_cents,
        enabled: s.data.enabled,
      });
    } else {
      setSettings(defaults);
    }

    if (p.data) {
      setPromos(
        p.data.map((row: any) => ({
          id: row.id,
          restaurantId: row.restaurant_id,
          code: row.code,
          description: row.description,
          discountType: row.discount_type,
          discountValue:
            row.discount_type === 'percent'
              ? Number(row.discount_value)
              : Number(row.discount_value) / 100,
          minimumSpend: row.minimum_spend_cents / 100,
          expiresAt: row.expires_at || undefined,
          enabled: row.enabled,
        })),
      );
    }

    if (b.data) {
      setBalance({
        points: Number(b.data.points ?? 0),
        coffeeStamps: Number(b.data.coffee_stamps ?? 0),
        freeCoffees: Number(b.data.free_coffees ?? 0),
      });
    }
    setLoading(false);
  }, [customerKey, targetRestaurantId]);

  useEffect(() => {
    setLoading(true);
    void refresh();
    if (!supabase || !customerKey) return;
    const client = supabase;
    const channel = client
      .channel(`loyalty-${targetRestaurantId}-${customerKey}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'loyalty_settings',
          filter: `restaurant_id=eq.${targetRestaurantId}`,
        },
        () => void refresh(),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'promo_codes',
          filter: `restaurant_id=eq.${targetRestaurantId}`,
        },
        () => void refresh(),
      )
      .on('broadcast', { event: 'loyalty-change' }, () => void refresh())
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [customerKey, refresh, targetRestaurantId]);

  const saveSettings = async (value: LoyaltySettings) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { error } = await supabase.from('loyalty_settings').upsert({
      restaurant_id: targetRestaurantId,
      points_per_dollar: value.pointsPerDollar,
      coffee_goal: value.coffeeGoal,
      free_coffee_max_cents: value.freeCoffeeMaxCents,
      enabled: value.enabled,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'restaurant_id' });
    if (error) throw new Error(error.message);
    await refresh();
  };

  const savePromo = async (
    promo: Omit<PromoCode, 'id' | 'restaurantId'> & { id?: string },
  ) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const row = {
      restaurant_id: targetRestaurantId,
      code: promo.code.trim().toUpperCase(),
      description: promo.description.trim(),
      discount_type: promo.discountType,
      discount_value:
        promo.discountType === 'percent'
          ? promo.discountValue
          : Math.round(promo.discountValue * 100),
      minimum_spend_cents: Math.round(promo.minimumSpend * 100),
      expires_at: promo.expiresAt || null,
      enabled: promo.enabled,
    };
    const result = promo.id
      ? await supabase.from('promo_codes').update(row).eq('id', promo.id)
      : await supabase.from('promo_codes').insert(row);
    if (result.error) throw new Error(result.error.message);
    await refresh();
  };

  const togglePromo = async (id: string, enabled: boolean) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { error } = await supabase
      .from('promo_codes')
      .update({ enabled })
      .eq('id', id);
    if (error) throw new Error(error.message);
    await refresh();
  };

  const value = useMemo(
    () => ({
      customerKey,
      settings,
      promos,
      balance,
      loading,
      refresh,
      saveSettings,
      savePromo,
      togglePromo,
    }),
    [customerKey, settings, promos, balance, loading, refresh],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useLoyalty() {
  const value = useContext(Context);
  if (!value) throw new Error('useLoyalty must be used inside LoyaltyProvider');
  return value;
}
