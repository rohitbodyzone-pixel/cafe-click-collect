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

export type PaymentSettings = {
  currency: string;
  cardEnabled: boolean;
  applePayEnabled: boolean;
  googlePayEnabled: boolean;
  payAtCounterEnabled: boolean;
};

type Store = PaymentSettings & {
  loading: boolean;
  error?: string;
  updateSettings: (values: Partial<PaymentSettings>) => Promise<void>;
  refresh: () => Promise<void>;
};

const Context = createContext<Store | null>(null);

export function PaymentSettingsProvider({ children }: PropsWithChildren) {
  const { currentRestaurant, updateRestaurantProfile } = useRestaurant();
  const { staff } = useAdminAuth();
  const targetRestaurantId = staff?.restaurantId || currentRestaurant.id;

  const [settings, setSettings] = useState<PaymentSettings>({
    currency: currentRestaurant.currency || 'nzd',
    cardEnabled: currentRestaurant.cardEnabled ?? true,
    applePayEnabled: currentRestaurant.applePayEnabled ?? true,
    googlePayEnabled: currentRestaurant.googlePayEnabled ?? true,
    payAtCounterEnabled: currentRestaurant.payAtCounterEnabled ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const fetchSettings = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const result = await supabase
      .from('restaurants')
      .select('currency, card_enabled, apple_pay_enabled, google_pay_enabled, pay_at_counter_enabled')
      .eq('id', targetRestaurantId)
      .maybeSingle();

    if (result.error) {
      setError(result.error.message);
    } else if (result.data) {
      setSettings({
        currency: result.data.currency || 'nzd',
        cardEnabled: result.data.card_enabled ?? true,
        applePayEnabled: result.data.apple_pay_enabled ?? true,
        googlePayEnabled: result.data.google_pay_enabled ?? true,
        payAtCounterEnabled: result.data.pay_at_counter_enabled ?? true,
      });
      setError(undefined);
    }
    setLoading(false);
  }, [targetRestaurantId]);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (values: Partial<PaymentSettings>) => {
    await updateRestaurantProfile(targetRestaurantId, {
      currency: values.currency,
      cardEnabled: values.cardEnabled,
      applePayEnabled: values.applePayEnabled,
      googlePayEnabled: values.googlePayEnabled,
      payAtCounterEnabled: values.payAtCounterEnabled,
    });
    setSettings((current) => ({ ...current, ...values }));
  };

  const value = useMemo(
    () => ({
      ...settings,
      loading,
      error,
      updateSettings,
      refresh: fetchSettings,
    }),
    [settings, loading, error, fetchSettings],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function usePaymentSettings() {
  const value = useContext(Context);
  if (!value)
    throw new Error('usePaymentSettings must be used inside PaymentSettingsProvider');
  return value;
}
