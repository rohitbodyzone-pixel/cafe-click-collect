import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/src/lib/supabase";

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
};

const defaults: PaymentSettings = {
  currency: "nzd",
  cardEnabled: true,
  applePayEnabled: true,
  googlePayEnabled: true,
  payAtCounterEnabled: true,
};
const Context = createContext<Store | null>(null);

export function PaymentSettingsProvider({ children }: PropsWithChildren) {
  const [settings, setSettings] = useState(defaults);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const fetchSettings = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data, error: fetchError } = await supabase
      .from("payment_settings")
      .select("*")
      .eq("id", 1)
      .single();
    if (fetchError) setError(fetchError.message);
    else if (data) {
      setSettings({
        currency: data.currency,
        cardEnabled: data.card_enabled,
        applePayEnabled: data.apple_pay_enabled,
        googlePayEnabled: data.google_pay_enabled,
        payAtCounterEnabled: data.pay_at_counter_enabled,
      });
      setError(undefined);
    }
    setLoading(false);
  }, []);
  useEffect(() => {
    void fetchSettings();
    if (!supabase) return;
    const client = supabase;
    const channel = client
      .channel("payment-settings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payment_settings" },
        () => void fetchSettings(),
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [fetchSettings]);
  const updateSettings = async (values: Partial<PaymentSettings>) => {
    if (!supabase) throw new Error("Supabase is not configured.");
    const row: Record<string, unknown> = {};
    if (values.cardEnabled !== undefined) row.card_enabled = values.cardEnabled;
    if (values.applePayEnabled !== undefined)
      row.apple_pay_enabled = values.applePayEnabled;
    if (values.googlePayEnabled !== undefined)
      row.google_pay_enabled = values.googlePayEnabled;
    if (values.payAtCounterEnabled !== undefined)
      row.pay_at_counter_enabled = values.payAtCounterEnabled;
    const { error: updateError } = await supabase
      .from("payment_settings")
      .update(row)
      .eq("id", 1);
    if (updateError) throw new Error(updateError.message);
    await fetchSettings();
  };
  const value = useMemo(
    () => ({ ...settings, loading, error, updateSettings }),
    [settings, loading, error],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function usePaymentSettings() {
  const value = useContext(Context);
  if (!value)
    throw new Error(
      "usePaymentSettings must be inside PaymentSettingsProvider",
    );
  return value;
}
