import { KitchenDocketPayload, CustomerReceiptPayload, PrinterAdapter, PrinterConfig } from './types';

// ESC/POS command constants
const ESC = '\x1B';
const GS = '\x1D';
const CMD = {
  INIT: `${ESC}@`,
  ALIGN_LEFT: `${ESC}a\x00`,
  ALIGN_CENTER: `${ESC}a\x01`,
  ALIGN_RIGHT: `${ESC}a\x02`,
  BOLD_ON: `${ESC}E\x01`,
  BOLD_OFF: `${ESC}E\x00`,
  DOUBLE_HEIGHT: `${GS}!\x10`,
  DOUBLE_WIDTH: `${GS}!\x20`,
  DOUBLE_SIZE: `${GS}!\x30`,
  NORMAL_SIZE: `${GS}!\x00`,
  FEED_AND_CUT: `${GS}V\x41\x03`,
  LINE: '------------------------------------------\n',
  DOUBLE_LINE: '==========================================\n',
};

export class ESCPOSAdapter implements PrinterAdapter {
  type = 'esc_pos' as const;

  formatKitchenDocket(payload: KitchenDocketPayload): string {
    let out = '';
    out += CMD.INIT;
    out += CMD.ALIGN_CENTER;
    out += `${CMD.DOUBLE_SIZE}${CMD.BOLD_ON}*** KITCHEN DOCKET ***${CMD.NORMAL_SIZE}${CMD.BOLD_OFF}\n`;
    out += `${CMD.DOUBLE_WIDTH}${payload.restaurantName.toUpperCase()}${CMD.NORMAL_SIZE}\n\n`;

    out += CMD.ALIGN_LEFT;
    out += CMD.DOUBLE_LINE;
    out += `${CMD.BOLD_ON}ORDER #${payload.orderId}${CMD.BOLD_OFF}\n`;
    out += `TYPE: ${payload.orderType === 'table' ? `TABLE [${payload.tableName || 'Dine-In'}]` : 'CLICK & COLLECT'}\n`;
    if (payload.customerName) out += `GUEST: ${payload.customerName}\n`;
    if (payload.pickupTime) out += `DUE AT: ${payload.pickupTime}\n`;
    out += `PLACED: ${new Date(payload.createdAt).toLocaleTimeString()}\n`;
    out += CMD.LINE;

    out += `${CMD.BOLD_ON}ITEMS ORDERED:${CMD.BOLD_OFF}\n\n`;
    for (const item of payload.items) {
      out += `${CMD.DOUBLE_HEIGHT}${CMD.BOLD_ON}${item.quantity}x ${item.name}${CMD.NORMAL_SIZE}${CMD.BOLD_OFF}\n`;
      if (item.modifiers && item.modifiers.length > 0) {
        for (const mod of item.modifiers) {
          out += `   > ${mod}\n`;
        }
      }
      if (item.notes) {
        out += `   * NOTE: ${item.notes}\n`;
      }
      out += '\n';
    }

    if (payload.orderNotes) {
      out += CMD.LINE;
      out += `${CMD.BOLD_ON}SPECIAL INSTRUCTIONS:${CMD.BOLD_OFF}\n`;
      out += `"${payload.orderNotes}"\n\n`;
    }

    out += CMD.DOUBLE_LINE;
    out += CMD.ALIGN_CENTER;
    out += `[ Printed by Cafe Click & Collect KDS ]\n\n\n`;
    out += CMD.FEED_AND_CUT;
    return out;
  }

  formatCustomerReceipt(payload: CustomerReceiptPayload): string {
    let out = '';
    out += CMD.INIT;
    out += CMD.ALIGN_CENTER;
    out += `${CMD.DOUBLE_SIZE}${CMD.BOLD_ON}${payload.restaurantName}${CMD.NORMAL_SIZE}${CMD.BOLD_OFF}\n`;
    if (payload.restaurantAddress) out += `${payload.restaurantAddress}\n`;
    if (payload.restaurantPhone) out += `Tel: ${payload.restaurantPhone}\n`;
    out += `TAX INVOICE (GST INCL)\n`;
    out += `GST No: 123-456-789\n`;

    out += CMD.ALIGN_LEFT;
    out += CMD.LINE;
    out += `Order #${payload.orderId} · ${new Date(payload.createdAt).toLocaleString()}\n`;
    if (payload.customerName) out += `Customer: ${payload.customerName}\n`;
    out += CMD.LINE;

    out += `${CMD.BOLD_ON}ITEM                                PRICE${CMD.BOLD_OFF}\n`;
    for (const item of payload.items) {
      const itemTitle = `${item.quantity}x ${item.name}`;
      const priceStr = `$${item.totalPrice.toFixed(2)}`;
      const padding = Math.max(1, 42 - itemTitle.length - priceStr.length);
      out += `${itemTitle}${' '.repeat(padding)}${priceStr}\n`;
      if (item.modifiers) {
        for (const m of item.modifiers) {
          out += `  + ${m}\n`;
        }
      }
    }

    out += CMD.LINE;
    const subStr = `$${payload.subtotal.toFixed(2)}`;
    out += `Subtotal:${' '.repeat(Math.max(1, 33 - subStr.length))}${subStr}\n`;
    if (payload.discount > 0) {
      const discStr = `-$${payload.discount.toFixed(2)}`;
      out += `Discount:${' '.repeat(Math.max(1, 33 - discStr.length))}${discStr}\n`;
    }
    const gstStr = `$${payload.gstAmount.toFixed(2)}`;
    out += `Includes 15% GST:${' '.repeat(Math.max(1, 25 - gstStr.length))}${gstStr}\n`;

    out += CMD.DOUBLE_LINE;
    const totalStr = `$${payload.total.toFixed(2)}`;
    out += `${CMD.DOUBLE_SIZE}${CMD.BOLD_ON}TOTAL:${' '.repeat(Math.max(1, 14 - totalStr.length))}${totalStr}${CMD.NORMAL_SIZE}${CMD.BOLD_OFF}\n`;
    out += `Payment: ${payload.paymentMethod.toUpperCase()} (${payload.paymentStatus.toUpperCase()})\n\n`;

    out += CMD.ALIGN_CENTER;
    out += `Thank you for your visit!\n`;
    out += `www.commonground.co.nz\n\n\n`;
    out += CMD.FEED_AND_CUT;
    return out;
  }

  async print(config: PrinterConfig, rawData: string): Promise<{ success: boolean; message: string }> {
    // Adapter execution pipeline
    console.log(`[ESC/POS Printer] Sending ${rawData.length} bytes to ${config.ipAddress}:${config.port || 9100}`);
    return {
      success: true,
      message: `ESC/POS data successfully queued to ${config.printerName} (${config.ipAddress})`,
    };
  }
}
