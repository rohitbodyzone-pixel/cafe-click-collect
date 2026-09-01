export type PrinterType = 'esc_pos' | 'star_webprnt' | 'network_raw' | 'browser_print' | 'mock';
export type ConnectionType = 'network' | 'usb' | 'bluetooth' | 'cloud';

export interface PrinterConfig {
  id: string;
  restaurantId: string;
  printerName: string;
  printerType: PrinterType;
  connectionType: ConnectionType;
  ipAddress?: string;
  port?: number;
  autoPrintOnOrder: boolean;
  printCustomerReceipts: boolean;
}

export interface DocketItem {
  name: string;
  quantity: number;
  modifiers?: string[];
  notes?: string;
}

export interface KitchenDocketPayload {
  orderId: string;
  orderNumber: string;
  restaurantName: string;
  orderType: 'pickup' | 'table';
  tableName?: string;
  customerName?: string;
  pickupTime?: string;
  createdAt: string;
  items: DocketItem[];
  orderNotes?: string;
}

export interface CustomerReceiptPayload {
  orderId: string;
  restaurantName: string;
  restaurantAddress?: string;
  restaurantPhone?: string;
  orderType: 'pickup' | 'table';
  tableName?: string;
  customerName?: string;
  createdAt: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    modifiers?: string[];
  }>;
  subtotal: number;
  discount: number;
  gstAmount: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
}

export interface PrinterAdapter {
  type: PrinterType;
  formatKitchenDocket(payload: KitchenDocketPayload): string | Uint8Array;
  formatCustomerReceipt(payload: CustomerReceiptPayload): string | Uint8Array;
  print(config: PrinterConfig, rawData: string | Uint8Array): Promise<{ success: boolean; message: string }>;
}
