export type POSProvider = 'square' | 'lightspeed' | 'toast' | 'clover' | 'mock';

export type POSConnectionStatus = 'connected' | 'disconnected' | 'error' | 'pending';

export interface POSIntegrationConfig {
  id?: string;
  restaurantId: string;
  provider: POSProvider;
  status?: POSConnectionStatus;
  locationId?: string;
  syncMenu?: boolean;
  syncOrders?: boolean;
  lastSyncAt?: string;
  errorDetails?: string;
  apiKey?: string;
  apiSecret?: string;
  merchantId?: string;
  webhookSecret?: string;
  isActive?: boolean;
  apiEnvironment?: 'sandbox' | 'production';
}

export interface POSSyncResult {
  success: boolean;
  provider: string;
  syncedOrdersCount?: number;
  syncedItemsCount?: number;
  message: string;
  timestamp: string;
  error?: string;
}

export interface POSConnection {
  id?: string;
  restaurantId: string;
  provider: POSProvider;
  status: POSConnectionStatus;
  locationId?: string;
  syncMenu: boolean;
  syncOrders: boolean;
  lastSyncAt?: string;
  errorDetails?: string;
}

export interface POSSyncLog {
  id: string;
  restaurantId: string;
  provider: POSProvider;
  eventType: 'menu_pull' | 'order_push' | 'inventory_sync' | 'refund_sync';
  status: 'success' | 'failed' | 'retrying';
  payload?: Record<string, any>;
  errorMessage?: string;
  createdAt: string;
}

export interface POSCatalogItem {
  posItemId: string;
  name: string;
  category: string;
  priceCents: number;
  sku?: string;
  isAvailable: boolean;
  modifiers?: { name: string; priceCents: number }[];
}

export interface POSOrderItem {
  itemId?: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  totalPriceCents?: number;
  modifiers?: any[];
}

export interface POSOrderPayload {
  posOrderId?: string;
  localOrderId?: string;
  externalOrderId?: string;
  restaurantId: string;
  customerName: string;
  diningOption?: string;
  tableNumber?: string;
  items: POSOrderItem[];
  totalCents: number;
  paymentMethod: string;
  paymentStatus?: string;
  status?: string;
}

export interface POSAdapter {
  provider: POSProvider;
  transformOrder: (order: POSOrderPayload) => any;
  syncMenu: (config: POSIntegrationConfig) => Promise<POSSyncResult>;
  pushOrder: (config: POSIntegrationConfig, order: POSOrderPayload) => Promise<POSSyncResult>;
  handleWebhook: (payload: any) => Promise<any>;
}
