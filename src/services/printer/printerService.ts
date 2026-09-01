import { ESCPOSAdapter } from './escpos';
import { StarWebPRNTAdapter } from './starWebPRNT';
import {
  KitchenDocketPayload,
  CustomerReceiptPayload,
  PrinterAdapter,
  PrinterConfig,
  PrinterType,
} from './types';

class MockPrinterAdapter implements PrinterAdapter {
  type = 'mock' as const;

  formatKitchenDocket(payload: KitchenDocketPayload): string {
    return [
      `==========================================`,
      `           *** KITCHEN DOCKET ***         `,
      `          ${payload.restaurantName.toUpperCase()}`,
      `==========================================`,
      `Order: #${payload.orderId}`,
      `Type: ${payload.orderType === 'table' ? `Table ${payload.tableName || 'Dine-In'}` : 'Click & Collect'}`,
      payload.customerName ? `Guest: ${payload.customerName}` : '',
      payload.pickupTime ? `Pickup Due: ${payload.pickupTime}` : '',
      `Time: ${new Date(payload.createdAt).toLocaleTimeString()}`,
      `------------------------------------------`,
      `ITEMS:`,
      ...payload.items.map(
        (item) =>
          `  ${item.quantity}x ${item.name}` +
          (item.modifiers && item.modifiers.length > 0
            ? '\n' + item.modifiers.map((m) => `     • ${m}`).join('\n')
            : '') +
          (item.notes ? `\n     * ${item.notes}` : ''),
      ),
      payload.orderNotes ? `------------------------------------------\nNote: "${payload.orderNotes}"` : '',
      `==========================================`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  formatCustomerReceipt(payload: CustomerReceiptPayload): string {
    return [
      `==========================================`,
      `             ${payload.restaurantName}    `,
      `             TAX INVOICE (GST)            `,
      `==========================================`,
      `Order #${payload.orderId} · ${new Date(payload.createdAt).toLocaleString()}`,
      `------------------------------------------`,
      ...payload.items.map(
        (i) => `  ${i.quantity}x ${i.name.padEnd(24)} $${i.totalPrice.toFixed(2).padStart(8)}`,
      ),
      `------------------------------------------`,
      `Subtotal:                        $${payload.subtotal.toFixed(2)}`,
      payload.discount > 0 ? `Discount:                       -$${payload.discount.toFixed(2)}` : '',
      `GST (15% included):              $${payload.gstAmount.toFixed(2)}`,
      `==========================================`,
      `TOTAL:                           $${payload.total.toFixed(2)}`,
      `Paid by: ${payload.paymentMethod.toUpperCase()} (${payload.paymentStatus.toUpperCase()})`,
      `==========================================`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  async print(config: PrinterConfig, rawData: string): Promise<{ success: boolean; message: string }> {
    console.log(`\n--- MOCK PRINTER [${config.printerName}] ---\n${rawData}\n------------------------------------------\n`);
    return {
      success: true,
      message: `[MOCK] Test docket printed successfully to ${config.printerName}`,
    };
  }
}

export class PrinterService {
  private static adapters: Record<PrinterType, PrinterAdapter> = {
    esc_pos: new ESCPOSAdapter(),
    star_webprnt: new StarWebPRNTAdapter(),
    network_raw: new ESCPOSAdapter(),
    browser_print: new MockPrinterAdapter(),
    mock: new MockPrinterAdapter(),
  };

  static getAdapter(type: PrinterType): PrinterAdapter {
    return this.adapters[type] || this.adapters.mock;
  }

  static async printKitchenDocket(
    config: PrinterConfig,
    payload: KitchenDocketPayload,
  ): Promise<{ success: boolean; message: string; formatted: string }> {
    const adapter = this.getAdapter(config.printerType);
    const formatted = adapter.formatKitchenDocket(payload);
    const res = await adapter.print(config, formatted);
    return { ...res, formatted: typeof formatted === 'string' ? formatted : new TextDecoder().decode(formatted) };
  }

  static async printCustomerReceipt(
    config: PrinterConfig,
    payload: CustomerReceiptPayload,
  ): Promise<{ success: boolean; message: string; formatted: string }> {
    const adapter = this.getAdapter(config.printerType);
    const formatted = adapter.formatCustomerReceipt(payload);
    const res = await adapter.print(config, formatted);
    return { ...res, formatted: typeof formatted === 'string' ? formatted : new TextDecoder().decode(formatted) };
  }
}
