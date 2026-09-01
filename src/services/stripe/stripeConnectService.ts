import { supabase } from '@/src/lib/supabase';
import { PlatformEconomicsSummary, TenantLedgerEntry } from './types';

export class StripeConnectService {
  /**
   * Server-Side Payment & Ledger Settlement
   */
  static async recordSettledPayment(
    orderId: string,
    paymentIntentId: string,
    idempotencyKey: string,
  ): Promise<any> {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { data, error } = await supabase.rpc('calculate_and_record_payment_ledger', {
      p_order_id: orderId,
      p_payment_intent_id: paymentIntentId,
      p_idempotency_key: idempotencyKey,
    });
    if (error) throw error;
    return data;
  }

  /**
   * Server-Side Refund Processing
   */
  static async processRefund(
    orderId: string,
    refundAmountCents: number,
    reason: string,
    idempotencyKey: string,
  ): Promise<any> {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { data, error } = await supabase.rpc('process_server_refund', {
      p_order_id: orderId,
      p_refund_amount_cents: refundAmountCents,
      p_reason: reason,
      p_idempotency_key: idempotencyKey,
    });
    if (error) throw error;
    return data;
  }

  /**
   * Super Admin Platform Economics Summary
   */
  static async getPlatformEconomics(): Promise<PlatformEconomicsSummary> {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { data, error } = await supabase.rpc('get_super_admin_platform_economics');
    if (error) throw error;
    return {
      platformGmvDollars: Math.round((data.platform_gmv_cents || 0) / 100),
      platformRevenueDollars: Math.round((data.platform_revenue_cents || 0) / 100),
      netRestaurantPayoutsDollars: Math.round((data.net_restaurant_payouts_cents || 0) / 100),
      totalSettledTransactions: data.total_settled_transactions || 0,
      connectedAccountsCount: data.connected_accounts_count || 0,
      mode: 'strict_test_mode',
      liveStripeEnabled: false,
    };
  }

  /**
   * Update Tenant Platform Fee Structure (Super Admin Only)
   */
  static async updateTenantFee(
    restaurantId: string,
    feePercentage: number,
    feeFixedCents: number,
  ): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { error } = await supabase.rpc('update_tenant_fee_structure', {
      p_restaurant_id: restaurantId,
      p_fee_percent: feePercentage,
      p_fee_fixed_cents: feeFixedCents,
    });
    if (error) throw error;
  }
}
