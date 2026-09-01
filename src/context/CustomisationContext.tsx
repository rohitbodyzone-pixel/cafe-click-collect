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

export type CustomisationGroupKind =
  | 'size'
  | 'milk'
  | 'sugar_quantity'
  | 'sugar_type'
  | 'extras';

export type CustomisationOption = {
  id: string;
  groupId: string;
  name: string;
  price: number;
  available: boolean;
  displayOrder: number;
};

export type CustomisationGroup = {
  id: string;
  restaurantId: string;
  name: string;
  kind: CustomisationGroupKind;
  options: CustomisationOption[];
};

export type SelectedCustomisation = {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  price: number;
};

type Store = {
  groups: CustomisationGroup[];
  loading: boolean;
  error?: string;
  addOption: (groupId: string, name: string, price: number) => Promise<void>;
  updateOption: (
    id: string,
    values: { name?: string; price?: number; available?: boolean },
  ) => Promise<void>;
  deleteOption: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const Context = createContext<Store | null>(null);

type GroupRow = {
  id: string;
  restaurant_id: string;
  name: string;
  kind: CustomisationGroupKind;
  customisation_options?: Array<{
    id: string;
    group_id: string;
    name: string;
    price_adjustment_cents: number;
    available: boolean;
    display_order: number;
  }>;
};

export function CustomisationProvider({ children }: PropsWithChildren) {
  const { currentRestaurant } = useRestaurant();
  const { staff } = useAdminAuth();
  const targetRestaurantId = staff?.restaurantId || currentRestaurant.id;

  const [groups, setGroups] = useState<CustomisationGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const fetchGroups = useCallback(async () => {
    if (!supabase) return;
    const result = await supabase
      .from('customisation_groups')
      .select('*, customisation_options(*)')
      .eq('restaurant_id', targetRestaurantId)
      .order('display_order');

    if (result.error) {
      setError(result.error.message);
    } else {
      setGroups(
        (result.data as GroupRow[]).map((group) => ({
          id: group.id,
          restaurantId: group.restaurant_id,
          name: group.name,
          kind: group.kind,
          options: (group.customisation_options ?? [])
            .sort((a, b) => a.display_order - b.display_order)
            .map((option) => ({
              id: option.id,
              groupId: option.group_id,
              name: option.name,
              price: option.price_adjustment_cents / 100,
              available: option.available,
              displayOrder: option.display_order,
            })),
        })),
      );
      setError(undefined);
    }
    setLoading(false);
  }, [targetRestaurantId]);

  useEffect(() => {
    setLoading(true);
    void fetchGroups();
    if (!supabase) return;
    const client = supabase;
    const channel = client
      .channel(`customisations-${targetRestaurantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customisation_options' },
        () => void fetchGroups(),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customisation_groups',
          filter: `restaurant_id=eq.${targetRestaurantId}`,
        },
        () => void fetchGroups(),
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [fetchGroups, targetRestaurantId]);

  const addOption = async (groupId: string, name: string, price: number) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { error: insErr } = await supabase.from('customisation_options').insert({
      group_id: groupId,
      name: name.trim(),
      price_adjustment_cents: Math.round(price * 100),
    });
    if (insErr) throw new Error(insErr.message);
    await fetchGroups();
  };

  const updateOption = async (
    id: string,
    values: { name?: string; price?: number; available?: boolean },
  ) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const payload: Record<string, unknown> = {};
    if (values.name !== undefined) payload.name = values.name.trim();
    if (values.price !== undefined)
      payload.price_adjustment_cents = Math.round(values.price * 100);
    if (values.available !== undefined) payload.available = values.available;
    const { error: updErr } = await supabase
      .from('customisation_options')
      .update(payload)
      .eq('id', id);
    if (updErr) throw new Error(updErr.message);
    await fetchGroups();
  };

  const deleteOption = async (id: string) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { error: delErr } = await supabase
      .from('customisation_options')
      .delete()
      .eq('id', id);
    if (delErr) throw new Error(delErr.message);
    await fetchGroups();
  };

  const value = useMemo(
    () => ({
      groups,
      loading,
      error,
      addOption,
      updateOption,
      deleteOption,
      refresh: fetchGroups,
    }),
    [groups, loading, error, fetchGroups, targetRestaurantId],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useCustomisations() {
  const value = useContext(Context);
  if (!value) throw new Error('useCustomisations must be used inside its provider');
  return value;
}
