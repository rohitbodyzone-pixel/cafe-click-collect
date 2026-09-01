export interface PrinterSettings {
  printerIp: string;
  printerPort: number;
  paperWidthMm: number; // 58 or 80
  autoPrintKitchenDocket: boolean;
  autoPrintCustomerReceipt: boolean;
  printStationFilter: string;
  cutPaper: boolean;
  openCashDrawer: boolean;
  gstNumber?: string;
  isEnabled: boolean;
}

export interface PrintableOrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  modifiers?: { name: string; price: number }[];
  notes?: string;
  station?: string;
}

export interface PrintableOrder {
  id: string;
  customerName: string;
  pickupTime: string;
  pickupCode?: string;
  orderType: 'pickup' | 'table';
  tableName?: string;
  items: PrintableOrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  staffName?: string;
  createdAt: string;
  orderNotes?: string;
}

export interface RestaurantBranding {
  name: string;
  address: string;
  phone: string;
  gstNumber?: string;
}

// ESC/POS Command Constants
const ESC = '\x1b';
const GS = '\x1d';

export const COMMANDS = {
  INIT: `${ESC}@`,
  ALIGN_LEFT: `${ESC}a\x00`,
  ALIGN_CENTER: `${ESC}a\x01`,
  ALIGN_RIGHT: `${ESC}a\x02`,
  BOLD_ON: `${ESC}E\x01`,
  BOLD_OFF: `${ESC}E\x00`,
  DOUBLE_SIZE_ON: `${GS}!\x11`,
  DOUBLE_SIZE_OFF: `${GS}!\x00`,
  CUT_PAPER: `${GS}VA\x03`,
  FEED_LINES: (n: number) => `${ESC}d${String.fromCharCode(n)}`,
  CASH_DRAWER_KICK: `${ESC}p\x00\x19\xfa`,
};

function formatLine(left: string, right: string, width: number = 42): string {
  const space = width - left.length - right.length;
  if (space < 1) {
    return `${left}\n${' '.repeat(Math.max(0, width - right.length))}${right}`;
  }
  return `${left}${' '.repeat(space)}${right}`;
}

function divider(width: number = 42): string {
  return '-'.repeat(width);
}

function doubleDivider(width: number = 42): string {
  return '='.repeat(width);
}

/**
 * Generates raw ESC/POS binary string for Kitchen Docket
 */
export function generateKitchenDocket(
  order: PrintableOrder,
  restaurant: RestaurantBranding,
  settings: Partial<PrinterSettings> = {},
): string {
  const width = settings.paperWidthMm === 58 ? 32 : 42;
  const parts: string[] = [];

  parts.push(COMMANDS.INIT);
  parts.push(COMMANDS.ALIGN_CENTER);
  parts.push(COMMANDS.BOLD_ON);
  parts.push(COMMANDS.DOUBLE_SIZE_ON);
  parts.push(`KITCHEN DOCKET\n`);
  parts.push(COMMANDS.DOUBLE_SIZE_OFF);
  parts.push(`${restaurant.name.toUpperCase()}\n`);
  parts.push(COMMANDS.BOLD_OFF);
  parts.push(divider(width) + '\n');

  parts.push(COMMANDS.ALIGN_LEFT);
  parts.push(COMMANDS.BOLD_ON);
  parts.push(formatLine(`TICKET: ${order.id}`, `CODE: ${order.pickupCode || 'N/A'}`, width) + '\n');
  parts.push(
    formatLine(
      `TYPE: ${order.orderType.toUpperCase()}`,
      order.tableName ? `TABLE: ${order.tableName}` : `TIME: ${order.pickupTime}`,
      width,
    ) + '\n',
  );
  parts.push(COMMANDS.BOLD_OFF);
  parts.push(`CUSTOMER: ${order.customerName}\n`);
  if (order.staffName) {
    parts.push(`TAKEN BY: ${order.staffName}\n`);
  }
  parts.push(divider(width) + '\n');

  // Order Items
  parts.push(COMMANDS.BOLD_ON);
  parts.push(formatLine('QTY  ITEM', 'STATION', width) + '\n');
  parts.push(COMMANDS.BOLD_OFF);
  parts.push(divider(width) + '\n');

  for (const item of order.items) {
    parts.push(COMMANDS.BOLD_ON);
    parts.push(formatLine(`${item.quantity}x   ${item.name}`, item.station || 'MAIN', width) + '\n');
    parts.push(COMMANDS.BOLD_OFF);

    if (item.modifiers && item.modifiers.length > 0) {
      for (const mod of item.modifiers) {
        parts.push(`     + ${mod.name}\n`);
      }
    }
    if (item.notes) {
      parts.push(`     * NOTE: ${item.notes}\n`);
    }
  }

  if (order.orderNotes) {
    parts.push(divider(width) + '\n');
    parts.push(COMMANDS.BOLD_ON);
    parts.push(`ORDER NOTE: ${order.orderNotes}\n`);
    parts.push(COMMANDS.BOLD_OFF);
  }

  parts.push(doubleDivider(width) + '\n');
  parts.push(COMMANDS.ALIGN_CENTER);
  parts.push(`PLACED AT: ${new Date(order.createdAt).toLocaleTimeString()}\n`);
  parts.push(COMMANDS.FEED_LINES(3));

  if (settings.cutPaper !== false) {
    parts.push(COMMANDS.CUT_PAPER);
  }

  return parts.join('');
}

/**
 * Generates raw ESC/POS binary string for Customer GST Tax Receipt
 */
export function generateCustomerGSTReceipt(
  order: PrintableOrder,
  restaurant: RestaurantBranding,
  settings: Partial<PrinterSettings> = {},
): string {
  const width = settings.paperWidthMm === 58 ? 32 : 42;
  const parts: string[] = [];
  const gstNumber = restaurant.gstNumber || settings.gstNumber || '123-456-789';
  const gstPortion = (order.total * 3) / 23; // NZ GST is 15% inclusive (3/23)

  parts.push(COMMANDS.INIT);
  parts.push(COMMANDS.ALIGN_CENTER);
  parts.push(COMMANDS.BOLD_ON);
  parts.push(COMMANDS.DOUBLE_SIZE_ON);
  parts.push(`${restaurant.name}\n`);
  parts.push(COMMANDS.DOUBLE_SIZE_OFF);
  parts.push(COMMANDS.BOLD_OFF);
  parts.push(`${restaurant.address}\n`);
  parts.push(`Ph: ${restaurant.phone}\n`);
  parts.push(COMMANDS.BOLD_ON);
  parts.push(`GST / TAX INVOICE\n`);
  parts.push(`GST Reg No: ${gstNumber}\n`);
  parts.push(COMMANDS.BOLD_OFF);
  parts.push(divider(width) + '\n');

  parts.push(COMMANDS.ALIGN_LEFT);
  parts.push(formatLine(`Order #: ${order.id}`, `Date: ${new Date(order.createdAt).toLocaleDateString()}`, width) + '\n');
  parts.push(formatLine(`Time: ${new Date(order.createdAt).toLocaleTimeString()}`, `Pickup: ${order.pickupCode || order.pickupTime}`, width) + '\n');
  parts.push(`Customer: ${order.customerName}\n`);
  if (order.staffName) {
    parts.push(`Served by: ${order.staffName}\n`);
  }
  parts.push(divider(width) + '\n');

  // Items List
  parts.push(COMMANDS.BOLD_ON);
  parts.push(formatLine('ITEM', 'TOTAL', width) + '\n');
  parts.push(COMMANDS.BOLD_OFF);
  parts.push(divider(width) + '\n');

  for (const item of order.items) {
    parts.push(formatLine(`${item.quantity}x ${item.name}`, `$${item.totalPrice.toFixed(2)}`, width) + '\n');
    if (item.modifiers && item.modifiers.length > 0) {
      for (const mod of item.modifiers) {
        parts.push(formatLine(`  + ${mod.name}`, mod.price > 0 ? `+$${mod.price.toFixed(2)}` : '', width) + '\n');
      }
    }
  }

  parts.push(divider(width) + '\n');
  parts.push(formatLine('Subtotal (excl. discounts):', `$${order.subtotal.toFixed(2)}`, width) + '\n');
  if (order.discount > 0) {
    parts.push(formatLine('Discounts / Promos:', `-$${order.discount.toFixed(2)}`, width) + '\n');
  }
  parts.push(COMMANDS.BOLD_ON);
  parts.push(formatLine('TOTAL (GST Incl.):', `$${order.total.toFixed(2)}`, width) + '\n');
  parts.push(COMMANDS.BOLD_OFF);
  parts.push(formatLine('Includes 15% GST:', `$${gstPortion.toFixed(2)}`, width) + '\n');
  parts.push(formatLine('Payment Method:', `${order.paymentMethod.toUpperCase()} (${order.paymentStatus.toUpperCase()})`, width) + '\n');
  parts.push(doubleDivider(width) + '\n');

  parts.push(COMMANDS.ALIGN_CENTER);
  parts.push(`Thank you for ordering with us!\n`);
  parts.push(`Please retain this invoice for your tax records.\n`);
  parts.push(COMMANDS.FEED_LINES(3));

  if (settings.cutPaper !== false) {
    parts.push(COMMANDS.CUT_PAPER);
  }

  if (settings.openCashDrawer && order.paymentMethod.toLowerCase().includes('cash')) {
    parts.push(COMMANDS.CASH_DRAWER_KICK);
  }

  return parts.join('');
}

export class ESCPOSAdapter {
  type = 'esc_pos' as const;
  formatKitchenDocket(payload: any): string {
    return generateKitchenDocket({
      id: payload.orderId || 'ORD-01',
      customerName: payload.customerName || 'Guest',
      pickupTime: payload.pickupTime || 'Immediate',
      pickupCode: payload.pickupCode,
      orderType: payload.orderType || 'pickup',
      tableName: payload.tableName,
      items: (payload.items || []).map((i: any) => ({
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice || 0,
        totalPrice: i.totalPrice || 0,
        modifiers: (i.modifiers || []).map((m: string) => ({ name: m, price: 0 })),
        notes: i.notes,
      })),
      subtotal: payload.subtotal || 0,
      discount: payload.discount || 0,
      total: payload.total || 0,
      paymentMethod: payload.paymentMethod || 'card',
      paymentStatus: payload.paymentStatus || 'paid',
      createdAt: payload.createdAt || new Date().toISOString(),
      orderNotes: payload.orderNotes,
    }, {
      name: payload.restaurantName || 'Cafe',
      address: 'Auckland NZ',
      phone: '09-1234567',
    });
  }

  formatCustomerReceipt(payload: any): string {
    return generateCustomerGSTReceipt({
      id: payload.orderId || 'ORD-01',
      customerName: payload.customerName || 'Guest',
      pickupTime: payload.pickupTime || 'Immediate',
      orderType: 'pickup',
      items: (payload.items || []).map((i: any) => ({
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice || 0,
        totalPrice: i.totalPrice || 0,
      })),
      subtotal: payload.subtotal || 0,
      discount: payload.discount || 0,
      total: payload.total || 0,
      paymentMethod: payload.paymentMethod || 'card',
      paymentStatus: payload.paymentStatus || 'paid',
      createdAt: payload.createdAt || new Date().toISOString(),
    }, {
      name: payload.restaurantName || 'Cafe',
      address: 'Auckland NZ',
      phone: '09-1234567',
      gstNumber: '123-456-789',
    });
  }

  generateRawPayload(type: 'kitchen' | 'receipt', payload: any): Uint8Array {
    const raw = type === 'kitchen' ? this.formatKitchenDocket(payload) : this.formatCustomerReceipt(payload);
    return new TextEncoder().encode(raw);
  }

  async print(config: any, rawData: Uint8Array): Promise<any> {
    console.log(`[ESC/POS Printer] Sending ${rawData.length} bytes to ${config.ipAddress}:${config.port}`);
    return {
      success: true,
      jobId: `PRINT-${Date.now()}`,
      bytesSent: rawData.length,
      timestamp: new Date().toISOString(),
    };
  }
}

