export type StripeConnectStatus = 'not_connected' | 'pending_verification' | 'connected_test_mode' | 'restricted';
export type TransactionType = 'charge' | 'refund' | 'partial_refund' | 'payout_transfer' | 'platform_fee' | 'dispute';
export type PayoutStatus = 'pending' | 'in_transit' | 'paid' | 'failed' | 'refunded';

export interface TenantLedgerEntry {
  id: string;
  restaurantId: string;
  orderId?: string;
  transactionType: TransactionType;
  grossAmountDollars: number;
  platformFeeDollars: number;
  stripeFeeDollars: number;
  netRestaurantAmountDollars: number;
  currency: string;
  paymentIntentId?: string;
  idempotencyKey?: string;
  payoutStatus: PayoutStatus;
  createdAt: string;
}

export interface PlatformEconomicsSummary {
  platformGmvDollars: number;
  platformRevenueDollars: number;
  netRestaurantPayoutsDollars: number;
  totalSettledTransactions: number;
  connectedAccountsCount: number;
  mode: 'strict_test_mode';
  liveStripeEnabled: boolean;
}

export interface TenantFeeStructure {
  restaurantId: string;
  restaurantName: string;
  stripeAccountId?: string;
  connectStatus: StripeConnectStatus;
  platformFeePercentage: number;
  platformFeeFixedCents: number;
}
