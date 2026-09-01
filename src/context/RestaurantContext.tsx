import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/src/lib/supabase';

export type Restaurant = {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl?: string;
  coverImageUrl?: string;
  address: string;
  phone: string;
  email: string;
  timezone: string;
  currency: string;
  openingTime: string;
  closingTime: string;
  averagePrepMinutes: number;
  slotIntervalMinutes: number;
  maxOrdersPerSlot: number;
  clickAndCollectEnabled: boolean;
  tableOrderingEnabled: boolean;
  payAtCounterEnabled: boolean;
  cardEnabled: boolean;
  applePayEnabled: boolean;
  googlePayEnabled: boolean;
  isActive: boolean;
  plan?: 'starter' | 'standard' | 'premium';
  subscriptionStatus?: 'trialing' | 'active' | 'past_due' | 'canceled';
  trialEnd?: string;
  billingCustomerId?: string;
  billingSubscriptionId?: string;
  featureFlags?: Record<string, boolean>;
};

export const DEFAULT_RESTAURANT_ID = 'c0000000-0000-0000-0000-000000000001';
export const DEFAULT_RESTAURANT_SLUG = 'common-ground';

export const fallbackRestaurant: Restaurant = {
  id: DEFAULT_RESTAURANT_ID,
  name: 'Common Ground',
  slug: DEFAULT_RESTAURANT_SLUG,
  description: 'Artisan coffee, bakery items and fresh café favourites.',
  address: '123 Queen Street, Auckland CBD',
  phone: '+64 9 123 4567',
  email: 'contact@commonground.co.nz',
  timezone: 'Pacific/Auckland',
  currency: 'nzd',
  openingTime: '07:00',
  closingTime: '16:00',
  averagePrepMinutes: 15,
  slotIntervalMinutes: 5,
  maxOrdersPerSlot: 5,
  clickAndCollectEnabled: true,
  tableOrderingEnabled: true,
  payAtCounterEnabled: true,
  cardEnabled: true,
  applePayEnabled: true,
  googlePayEnabled: true,
  isActive: true,
  plan: 'starter',
  subscriptionStatus: 'active',
  featureFlags: {},
};

type RestaurantRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo_url: string | null;
  cover_image_url: string | null;
  address: string;
  phone: string;
  email: string;
  timezone: string;
  currency: string;
  opening_time: string;
  closing_time: string;
  average_prep_minutes: number;
  slot_interval_minutes: number;
  max_orders_per_slot: number;
  click_and_collect_enabled: boolean;
  table_ordering_enabled: boolean;
  pay_at_counter_enabled: boolean;
  card_enabled: boolean;
  apple_pay_enabled: boolean;
  google_pay_enabled: boolean;
  is_active: boolean;
};

function mapRow(row: RestaurantRow): Restaurant {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    logoUrl: row.logo_url ?? undefined,
    coverImageUrl: row.cover_image_url ?? undefined,
    address: row.address,
    phone: row.phone,
    email: row.email,
    timezone: row.timezone,
    currency: row.currency,
    openingTime: (row.opening_time || '07:00').slice(0, 5),
    closingTime: (row.closing_time || '16:00').slice(0, 5),
    averagePrepMinutes: row.average_prep_minutes ?? 15,
    slotIntervalMinutes: row.slot_interval_minutes ?? 5,
    maxOrdersPerSlot: row.max_orders_per_slot ?? 5,
    clickAndCollectEnabled: row.click_and_collect_enabled ?? true,
    tableOrderingEnabled: row.table_ordering_enabled ?? true,
    payAtCounterEnabled: row.pay_at_counter_enabled ?? true,
    cardEnabled: row.card_enabled ?? true,
    applePayEnabled: row.apple_pay_enabled ?? true,
    googlePayEnabled: row.google_pay_enabled ?? true,
    isActive: row.is_active ?? true,
  };
}

export type CreateRestaurantInput = {
  name: string;
  slug: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  timezone?: string;
  currency?: string;
  openingTime?: string;
  closingTime?: string;
  averagePrepMinutes?: number;
  slotIntervalMinutes?: number;
  maxOrdersPerSlot?: number;
};

type Store = {
  restaurants: Restaurant[];
  currentRestaurant: Restaurant;
  loading: boolean;
  error?: string;
  selectRestaurantBySlug: (slug: string) => Promise<Restaurant | undefined>;
  selectRestaurantById: (id: string) => Promise<Restaurant | undefined>;
  setCurrentRestaurant: (restaurant: Restaurant) => void;
  updateRestaurantProfile: (id: string, updates: Partial<Restaurant>) => Promise<void>;
  createRestaurant: (input: CreateRestaurantInput) => Promise<Restaurant>;
  toggleRestaurantActive: (id: string, isActive: boolean) => Promise<void>;
  refresh: () => Promise<void>;
};

const Context = createContext<Store | null>(null);

const STORAGE_KEY = 'cafe-selected-restaurant-slug';

export function RestaurantProvider({ children }: PropsWithChildren) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([fallbackRestaurant]);
  const [currentRestaurant, setCurrentRestaurantState] = useState<Restaurant>(fallbackRestaurant);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const setCurrentRestaurant = useCallback((res: Restaurant) => {
    setCurrentRestaurantState(res);
    void AsyncStorage.setItem(STORAGE_KEY, res.slug);
  }, []);

  const fetchRestaurants = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data, error: fetchError } = await supabase
      .from('restaurants')
      .select('*')
      .order('name');

    if (fetchError) {
      setError(fetchError.message);
    } else if (data && data.length > 0) {
      const list = (data as RestaurantRow[]).map(mapRow);
      setRestaurants(list);
      setError(undefined);

      // Check saved slug from storage or fallback
      const savedSlug = await AsyncStorage.getItem(STORAGE_KEY);
      const matched = list.find((r) => r.slug === savedSlug) ||
                      list.find((r) => r.id === currentRestaurant.id) ||
                      list.find((r) => r.slug === DEFAULT_RESTAURANT_SLUG) ||
                      list[0];
      if (matched) {
        setCurrentRestaurantState(matched);
      }
    }
    setLoading(false);
  }, [currentRestaurant.id]);

  useEffect(() => {
    void fetchRestaurants();
    if (!supabase) return;
    const client = supabase;
    const channel = client
      .channel('public-restaurants')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurants' }, () => {
        void fetchRestaurants();
      })
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [fetchRestaurants]);

  const selectRestaurantBySlug = useCallback(
    async (slug: string): Promise<Restaurant | undefined> => {
      const normalized = slug.trim().toLowerCase();
      let found = restaurants.find((r) => r.slug.toLowerCase() === normalized);
      if (!found && supabase) {
        const { data } = await supabase
          .from('restaurants')
          .select('*')
          .eq('slug', normalized)
          .maybeSingle();
        if (data) {
          found = mapRow(data as RestaurantRow);
        }
      }
      if (found) {
        setCurrentRestaurant(found);
      }
      return found;
    },
    [restaurants, setCurrentRestaurant],
  );

  const selectRestaurantById = useCallback(
    async (id: string): Promise<Restaurant | undefined> => {
      let found = restaurants.find((r) => r.id === id);
      if (!found && supabase) {
        const { data } = await supabase
          .from('restaurants')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (data) {
          found = mapRow(data as RestaurantRow);
        }
      }
      if (found) {
        setCurrentRestaurant(found);
      }
      return found;
    },
    [restaurants, setCurrentRestaurant],
  );

  const updateRestaurantProfile = async (id: string, updates: Partial<Restaurant>) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const row: Record<string, unknown> = {};
    if (updates.name !== undefined) row.name = updates.name.trim();
    if (updates.slug !== undefined) row.slug = updates.slug.trim().toLowerCase();
    if (updates.description !== undefined) row.description = updates.description.trim();
    if (updates.address !== undefined) row.address = updates.address.trim();
    if (updates.phone !== undefined) row.phone = updates.phone.trim();
    if (updates.email !== undefined) row.email = updates.email.trim();
    if (updates.openingTime !== undefined) row.opening_time = updates.openingTime;
    if (updates.closingTime !== undefined) row.closing_time = updates.closingTime;
    if (updates.averagePrepMinutes !== undefined) row.average_prep_minutes = updates.averagePrepMinutes;
    if (updates.slotIntervalMinutes !== undefined) row.slot_interval_minutes = updates.slotIntervalMinutes;
    if (updates.maxOrdersPerSlot !== undefined) row.max_orders_per_slot = updates.maxOrdersPerSlot;
    if (updates.clickAndCollectEnabled !== undefined) row.click_and_collect_enabled = updates.clickAndCollectEnabled;
    if (updates.tableOrderingEnabled !== undefined) row.table_ordering_enabled = updates.tableOrderingEnabled;
    if (updates.payAtCounterEnabled !== undefined) row.pay_at_counter_enabled = updates.payAtCounterEnabled;
    if (updates.cardEnabled !== undefined) row.card_enabled = updates.cardEnabled;
    if (updates.applePayEnabled !== undefined) row.apple_pay_enabled = updates.applePayEnabled;
    if (updates.googlePayEnabled !== undefined) row.google_pay_enabled = updates.googlePayEnabled;
    if (updates.isActive !== undefined) row.is_active = updates.isActive;

    const { error: updateError } = await supabase
      .from('restaurants')
      .update(row)
      .eq('id', id);
    if (updateError) throw new Error(updateError.message);

    await fetchRestaurants();
  };

  const createRestaurant = async (input: CreateRestaurantInput): Promise<Restaurant> => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const slug = input.slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const { data, error: insertError } = await supabase
      .from('restaurants')
      .insert({
        name: input.name.trim(),
        slug,
        description: input.description?.trim() || '',
        address: input.address?.trim() || '',
        phone: input.phone?.trim() || '',
        email: input.email?.trim() || '',
        timezone: input.timezone || 'Pacific/Auckland',
        currency: input.currency || 'nzd',
        opening_time: input.openingTime || '07:00',
        closing_time: input.closingTime || '16:00',
        average_prep_minutes: input.averagePrepMinutes || 15,
        slot_interval_minutes: input.slotIntervalMinutes || 5,
        max_orders_per_slot: input.maxOrdersPerSlot || 5,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) throw new Error(insertError.message);
    const created = mapRow(data as RestaurantRow);
    await fetchRestaurants();
    return created;
  };

  const toggleRestaurantActive = async (id: string, isActive: boolean) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { error: updateError } = await supabase
      .from('restaurants')
      .update({ is_active: isActive })
      .eq('id', id);
    if (updateError) throw new Error(updateError.message);
    await fetchRestaurants();
  };

  const value = useMemo(
    () => ({
      restaurants,
      currentRestaurant,
      loading,
      error,
      selectRestaurantBySlug,
      selectRestaurantById,
      setCurrentRestaurant,
      updateRestaurantProfile,
      createRestaurant,
      toggleRestaurantActive,
      refresh: fetchRestaurants,
    }),
    [
      restaurants,
      currentRestaurant,
      loading,
      error,
      selectRestaurantBySlug,
      selectRestaurantById,
      setCurrentRestaurant,
      fetchRestaurants,
    ],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useRestaurant() {
  const value = useContext(Context);
  if (!value) throw new Error('useRestaurant must be used inside RestaurantProvider');
  return value;
}
