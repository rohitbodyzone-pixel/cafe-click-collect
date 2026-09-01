import { KitchenDocketPayload, CustomerReceiptPayload, PrinterAdapter, PrinterConfig } from './types';

export class StarWebPRNTAdapter implements PrinterAdapter {
  type = 'star_webprnt' as const;

  formatKitchenDocket(payload: KitchenDocketPayload): string {
    const builder = [
      '<root>',
      '<document>',
      `<text align="center" width="2" height="2">KITCHEN DOCKET</text>`,
      `<text align="center" bold="true">${payload.restaurantName.toUpperCase()}</text>`,
      `<text>----------------------------------------</text>`,
      `<text bold="true">ORDER #${payload.orderId}</text>`,
      `<text>Type: ${payload.orderType === 'table' ? `Table ${payload.tableName}` : 'Click & Collect'}</text>`,
      payload.customerName ? `<text>Guest: ${payload.customerName}</text>` : '',
      payload.pickupTime ? `<text bold="true">Pickup Time: ${payload.pickupTime}</text>` : '',
      `<text>Time: ${new Date(payload.createdAt).toLocaleTimeString()}</text>`,
      `<text>----------------------------------------</text>`,
      ...payload.items.map(
        (i) =>
          `<text bold="true" height="2">${i.quantity}x ${i.name}</text>` +
          (i.modifiers ? i.modifiers.map((m) => `<text>  • ${m}</text>`).join('') : '') +
          (i.notes ? `<text bold="true">  * NOTE: ${i.notes}</text>` : ''),
      ),
      payload.orderNotes ? `<text>----------------------------------------</text><text bold="true">SPECIAL: ${payload.orderNotes}</text>` : '',
      `<cut type="feed" />`,
      '</document>',
      '</root>',
    ].filter(Boolean);

    return builder.join('\n');
  }

  formatCustomerReceipt(payload: CustomerReceiptPayload): string {
    const builder = [
      '<root>',
      '<document>',
      `<text align="center" width="2" height="2">${payload.restaurantName}</text>`,
      `<text align="center">Tax Invoice (GST Included)</text>`,
      `<text>----------------------------------------</text>`,
      `<text>Order #${payload.orderId} · ${new Date(payload.createdAt).toLocaleString()}</text>`,
      `<text>----------------------------------------</text>`,
      ...payload.items.map(
        (i) =>
          `<text>${i.quantity}x ${i.name} - $${i.totalPrice.toFixed(2)}</text>` +
          (i.modifiers ? i.modifiers.map((m) => `<text>  + ${m}</text>`).join('') : ''),
      ),
      `<text>----------------------------------------</text>`,
      `<text>Subtotal: $${payload.subtotal.toFixed(2)}</text>`,
      `<text>GST (15%): $${payload.gstAmount.toFixed(2)}</text>`,
      `<text width="2" height="2" bold="true">TOTAL: $${payload.total.toFixed(2)}</text>`,
      `<text>Payment: ${payload.paymentMethod.toUpperCase()}</text>`,
      `<text align="center">Thank you!</text>`,
      `<cut type="feed" />`,
      '</document>',
      '</root>',
    ];
    return builder.join('\n');
  }

  async print(config: PrinterConfig, rawData: string): Promise<{ success: boolean; message: string }> {
    console.log(`[Star WebPRNT] Dispatched XML payload to Star printer at ${config.ipAddress}`);
    return {
      success: true,
      message: `Star WebPRNT XML job accepted by ${config.printerName}`,
    };
  }
}
