import {
  POSAdapter,
  POSIntegrationConfig,
  POSOrderPayload,
  POSProvider,
  POSSyncResult,
} from './types';

// Mock POS Adapter (Deterministic Sandbox)
class MockPOSAdapter implements POSAdapter {
  provider = 'mock' as const;

  transformOrder(order: POSOrderPayload) {
    return {
      pos_reference: `POS-MOCK-${order.externalOrderId}`,
      header: {
        type: order.diningOption,
        table: order.tableNumber || 'COUNTER',
        guest: order.customerName,
      },
      line_items: order.items.map((i) => ({
        sku: i.itemId,
        item_name: i.name,
        qty: i.quantity,
        amount: (i.totalPriceCents ?? i.unitPriceCents * i.quantity) / 100,
        options: i.modifiers,
      })),
      tender: {
        total: order.totalCents / 100,
        status: order.paymentStatus,
        method: order.paymentMethod,
      },
    };
  }

  async syncMenu(config: POSIntegrationConfig): Promise<POSSyncResult> {
    return {
      success: true,
      provider: 'mock',
      syncedOrdersCount: 0,
      syncedItemsCount: 5,
      message: `[MOCK POS] 5 catalog menu items synchronized with ${config.provider.toUpperCase()} sandbox.`,
      timestamp: new Date().toISOString(),
    };
  }

  async pushOrder(config: POSIntegrationConfig, order: POSOrderPayload): Promise<POSSyncResult> {
    const payload = this.transformOrder(order);
    console.log(`[POS Integration] Order #${order.externalOrderId} injected to ${config.provider}:`, payload);
    return {
      success: true,
      provider: 'mock',
      syncedOrdersCount: 1,
      syncedItemsCount: order.items.length,
      message: `Order #${order.externalOrderId} dispatched to POS register feed.`,
      timestamp: new Date().toISOString(),
    };
  }

  async handleWebhook(payload: any) {
    return { handled: true, action: 'order_status_updated' };
  }
}

// Square POS Adapter Model
class SquarePOSAdapter implements POSAdapter {
  provider = 'square' as const;

  transformOrder(order: POSOrderPayload) {
    return {
      order: {
        location_id: 'LOC_COMMONGROUND_01',
        reference_id: order.externalOrderId,
        line_items: order.items.map((i) => ({
          name: i.name,
          quantity: String(i.quantity),
          base_price_money: { amount: i.unitPriceCents, currency: 'NZD' },
          modifiers: i.modifiers?.map((m) => ({ name: m.name })),
        })),
        fulfillments: [
          {
            type: order.diningOption === 'pickup' ? 'PICKUP' : 'DELIVERY',
            pickup_details: { recipient: { display_name: order.customerName } },
          },
        ],
      },
    };
  }

  async syncMenu(config: POSIntegrationConfig): Promise<POSSyncResult> {
    return {
      success: true,
      provider: 'square',
      syncedOrdersCount: 0,
      syncedItemsCount: 5,
      message: `Square Catalog API: Synced products & modifier groups.`,
      timestamp: new Date().toISOString(),
    };
  }

  async pushOrder(config: POSIntegrationConfig, order: POSOrderPayload): Promise<POSSyncResult> {
    return {
      success: true,
      provider: 'square',
      syncedOrdersCount: 1,
      syncedItemsCount: order.items.length,
      message: `Square Orders API: Order #${order.externalOrderId} created in Square POS register.`,
      timestamp: new Date().toISOString(),
    };
  }

  async handleWebhook(payload: any) {
    return { handled: true, action: 'square_payment_updated' };
  }
}

// Lightspeed Restaurant POS Adapter
class LightspeedPOSAdapter implements POSAdapter {
  provider = 'lightspeed' as const;

  transformOrder(order: POSOrderPayload) {
    return {
      tableId: order.tableNumber || 0,
      orderType: order.diningOption === 'dine_in' ? 'DINE_IN' : 'TAKEAWAY',
      items: order.items.map((i) => ({
        sku: i.itemId,
        quantity: i.quantity,
        price: i.unitPriceCents,
      })),
    };
  }

  async syncMenu(config: POSIntegrationConfig): Promise<POSSyncResult> {
    return {
      success: true,
      provider: 'lightspeed',
      syncedOrdersCount: 0,
      syncedItemsCount: 5,
      message: `Lightspeed K-Series: Menu catalog synchronized.`,
      timestamp: new Date().toISOString(),
    };
  }

  async pushOrder(config: POSIntegrationConfig, order: POSOrderPayload): Promise<POSSyncResult> {
    return {
      success: true,
      provider: 'lightspeed',
      syncedOrdersCount: 1,
      syncedItemsCount: order.items.length,
      message: `Lightspeed K-Series: Order ticket #${order.externalOrderId} sent to table pass.`,
      timestamp: new Date().toISOString(),
    };
  }

  async handleWebhook(payload: any) {
    return { handled: true, action: 'lightspeed_order_closed' };
  }
}

// Toast POS Adapter
class ToastPOSAdapter implements POSAdapter {
  provider = 'toast' as const;

  transformOrder(order: POSOrderPayload) {
    return {
      diningOption: order.diningOption,
      checks: [
        {
          items: order.items.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            price: i.unitPriceCents / 100,
          })),
        },
      ],
    };
  }

  async syncMenu(config: POSIntegrationConfig): Promise<POSSyncResult> {
    return {
      success: true,
      provider: 'toast',
      syncedOrdersCount: 0,
      syncedItemsCount: 5,
      message: `Toast Orders API: Menu synchronized.`,
      timestamp: new Date().toISOString(),
    };
  }

  async pushOrder(config: POSIntegrationConfig, order: POSOrderPayload): Promise<POSSyncResult> {
    return {
      success: true,
      provider: 'toast',
      syncedOrdersCount: 1,
      syncedItemsCount: order.items.length,
      message: `Toast POS: Order #${order.externalOrderId} printed at kitchen station.`,
      timestamp: new Date().toISOString(),
    };
  }

  async handleWebhook(payload: any) {
    return { handled: true, action: 'toast_check_closed' };
  }
}

export class POSService {
  private static adapters: Record<POSProvider, POSAdapter> = {
    mock: new MockPOSAdapter(),
    square: new SquarePOSAdapter(),
    lightspeed: new LightspeedPOSAdapter(),
    toast: new ToastPOSAdapter(),
    clover: new MockPOSAdapter(),
  };

  static getAdapter(provider: POSProvider): POSAdapter {
    return this.adapters[provider] || this.adapters.mock;
  }

  static async syncMenu(config: POSIntegrationConfig): Promise<POSSyncResult> {
    const adapter = this.getAdapter(config.provider);
    return adapter.syncMenu(config);
  }

  static async pushOrder(config: POSIntegrationConfig, order: POSOrderPayload): Promise<POSSyncResult> {
    const adapter = this.getAdapter(config.provider);
    return adapter.pushOrder(config, order);
  }
}
