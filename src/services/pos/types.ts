export type POSProvider = 'square' | 'lightspeed' | 'toast' | 'clover' | 'mock';

export interface POSIntegrationConfig {
  id: string;
  restaurantId: string;
  provider: POSProvider;
  enabled: boolean;
  syncMenu: boolean;
  syncOrders: boolean;
  apiEnvironment: 'sandbox' | 'production';
  webhookUrl?: string;
  lastSyncAt?: string;
}

export interface POSOrderItem {
  itemId: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  totalPriceCents: number;
  modifiers?: Array<{
    name: string;
    priceCents: number;
  }>;
  specialInstructions?: string;
}

export interface POSOrderPayload {
  externalOrderId: string;
  restaurantId: string;
  customerName?: string;
  customerPhone?: string;
  diningOption: 'pickup' | 'dine_in';
  tableNumber?: string;
  items: POSOrderItem[];
  subtotalCents: number;
  taxCents: number;
  discountCents: number;
  totalCents: number;
  paymentMethod: string;
  paymentStatus: 'PAID' | 'UNPAID';
  createdAt: string;
}

export interface POSSyncResult {
  success: boolean;
  provider: POSProvider;
  syncedOrdersCount: number;
  syncedItemsCount: number;
  message: string;
  timestamp: string;
}

export interface POSAdapter {
  provider: POSProvider;
  transformOrder(order: POSOrderPayload): any;
  syncMenu(config: POSIntegrationConfig): Promise<POSSyncResult>;
  pushOrder(config: POSIntegrationConfig, order: POSOrderPayload): Promise<POSSyncResult>;
  handleWebhook(payload: any): Promise<{ handled: boolean; action: string }>;
}
