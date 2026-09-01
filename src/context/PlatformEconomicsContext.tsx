import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useRestaurant } from './RestaurantContext';
import {
  TenantLedgerEntry,
  PlatformEconomicsSummary,
  TenantFeeStructure,
  StripeConnectStatus,
} from '../services/stripe/types';
import { StripeConnectService } from '../services/stripe/stripeConnectService';

interface PlatformEconomicsContextType {
  ledgerEntries: TenantLedgerEntry[];
  totalGrossDollars: number;
  totalPlatformFeeDollars: number;
  totalNetPayoutDollars: number;
  connectStatus: StripeConnectStatus;
  stripeAccountId?: string;
  feePercentage: number;
  feeFixedCents: number;
  platformEconomics: PlatformEconomicsSummary | null;
  tenantFeeStructures: TenantFeeStructure[];
  updateFeeStructure: (restaurantId: string, feePct: number, fixedCents: number) => Promise<void>;
  refundOrder: (orderId: string, amountCents: number, reason: string) => Promise<void>;
  loading: boolean;
  refresh: () => Promise<void>;
}

const PlatformEconomicsContext = createContext<PlatformEconomicsContextType | undefined>(undefined);

export function PlatformEconomicsProvider({ children }: { children: React.ReactNode }) {
  const { currentRestaurant } = useRestaurant();

  const [ledgerEntries, setLedgerEntries] = useState<TenantLedgerEntry[]>([]);
  const [connectStatus, setConnectStatus] = useState<StripeConnectStatus>('connected_test_mode');
  const [stripeAccountId, setStripeAccountId] = useState<string | undefined>(undefined);
  const [feePercentage, setFeePercentage] = useState<number>(2.5);
  const [feeFixedCents, setFeeFixedCents] = useState<number>(30);
  const [platformEconomics, setPlatformEconomics] = useState<PlatformEconomicsSummary | null>(null);
  const [tenantFeeStructures, setTenantFeeStructures] = useState<TenantFeeStructure[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFinancialData = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    try {
      // 1. Current restaurant settings
      const { data: restData } = await supabase
        .from('restaurants')
        .select('stripe_account_id, stripe_connect_status, platform_fee_percentage, platform_fee_fixed_cents')
        .eq('id', currentRestaurant.id)
        .single();

      if (restData) {
        setStripeAccountId(restData.stripe_account_id);
        setConnectStatus(restData.stripe_connect_status || 'connected_test_mode');
        setFeePercentage(Number(restData.platform_fee_percentage) || 2.5);
        setFeeFixedCents(Number(restData.platform_fee_fixed_cents) || 30);
      }

      // 2. Tenant Financial Ledger
      const { data: ledgerData } = await supabase
        .from('tenant_financial_ledger')
        .select('*')
        .eq('restaurant_id', currentRestaurant.id)
        .order('created_at', { ascending: false });

      if (ledgerData) {
        setLedgerEntries(
          ledgerData.map((l) => ({
            id: l.id,
            restaurantId: l.restaurant_id,
            orderId: l.order_id,
            transactionType: l.transaction_type,
            grossAmountDollars: l.gross_amount_cents / 100,
            platformFeeDollars: l.platform_fee_cents / 100,
            stripeFeeDollars: l.stripe_fee_cents / 100,
            netRestaurantAmountDollars: l.net_restaurant_amount_cents / 100,
            currency: l.currency,
            paymentIntentId: l.payment_intent_id,
            idempotencyKey: l.idempotency_key,
            payoutStatus: l.payout_status,
            createdAt: l.created_at,
          })),
        );
      }

      // 3. Platform Economics (Super Admin)
      const econ = await StripeConnectService.getPlatformEconomics();
      setPlatformEconomics(econ);

      // 4. All Tenant Fee Structures
      const { data: allRests } = await supabase
        .from('restaurants')
        .select('id, name, stripe_account_id, stripe_connect_status, platform_fee_percentage, platform_fee_fixed_cents')
        .order('name', { ascending: true });

      if (allRests) {
        setTenantFeeStructures(
          allRests.map((r) => ({
            restaurantId: r.id,
            restaurantName: r.name,
            stripeAccountId: r.stripe_account_id,
            connectStatus: r.stripe_connect_status,
            platformFeePercentage: Number(r.platform_fee_percentage) || 2.5,
            platformFeeFixedCents: Number(r.platform_fee_fixed_cents) || 30,
          })),
        );
      }
    } catch (e) {
      console.warn('Error loading financial data:', e);
    } finally {
      setLoading(false);
    }
  }, [currentRestaurant.id]);

  useEffect(() => {
    void loadFinancialData();
  }, [loadFinancialData]);

  // Totals calculations
  const totalGrossDollars = ledgerEntries
    .filter((l) => l.transactionType === 'charge')
    .reduce((acc, curr) => acc + curr.grossAmountDollars, 0);

  const totalPlatformFeeDollars = ledgerEntries
    .filter((l) => l.transactionType === 'charge')
    .reduce((acc, curr) => acc + curr.platformFeeDollars, 0);

  const totalNetPayoutDollars = ledgerEntries.reduce(
    (acc, curr) => acc + curr.netRestaurantAmountDollars,
    0,
  );

  const updateFeeStructure = async (restaurantId: string, feePct: number, fixedCents: number) => {
    await StripeConnectService.updateTenantFee(restaurantId, feePct, fixedCents);
    await loadFinancialData();
  };

  const refundOrder = async (orderId: string, amountCents: number, reason: string) => {
    const key = `REF-${orderId}-${Date.now()}`;
    await StripeConnectService.processRefund(orderId, amountCents, reason, key);
    await loadFinancialData();
  };

  return (
    <PlatformEconomicsContext.Provider
      value={{
        ledgerEntries,
        totalGrossDollars,
        totalPlatformFeeDollars,
        totalNetPayoutDollars,
        connectStatus,
        stripeAccountId,
        feePercentage,
        feeFixedCents,
        platformEconomics,
        tenantFeeStructures,
        updateFeeStructure,
        refundOrder,
        loading,
        refresh: loadFinancialData,
      }}
    >
      {children}
    </PlatformEconomicsContext.Provider>
  );
}

export function usePlatformEconomics() {
  const context = useContext(PlatformEconomicsContext);
  if (!context) {
    throw new Error('usePlatformEconomics must be used within a PlatformEconomicsProvider');
  }
  return context;
}
