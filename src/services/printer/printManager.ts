import { supabase } from '@/src/lib/supabase';
import {
  generateKitchenDocket,
  generateCustomerGSTReceipt,
  PrintableOrder,
  PrinterSettings,
  RestaurantBranding,
} from './escpos';

export const DEFAULT_PRINTER_SETTINGS: PrinterSettings = {
  printerIp: '192.168.1.200',
  printerPort: 9100,
  paperWidthMm: 80,
  autoPrintKitchenDocket: true,
  autoPrintCustomerReceipt: false,
  printStationFilter: 'all',
  cutPaper: true,
  openCashDrawer: false,
  gstNumber: '134-889-012',
  isEnabled: true,
};

export async function fetchPrinterSettings(restaurantId: string): Promise<PrinterSettings> {
  if (!supabase) return DEFAULT_PRINTER_SETTINGS;
  try {
    const { data, error } = await supabase
      .from('restaurant_printer_settings')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .maybeSingle();

    if (error || !data) return DEFAULT_PRINTER_SETTINGS;

    return {
      printerIp: data.printer_ip || '192.168.1.200',
      printerPort: data.printer_port || 9100,
      paperWidthMm: data.paper_width_mm || 80,
      autoPrintKitchenDocket: data.auto_print_kitchen_docket ?? true,
      autoPrintCustomerReceipt: data.auto_print_customer_receipt ?? false,
      printStationFilter: data.print_station_filter || 'all',
      cutPaper: data.cut_paper ?? true,
      openCashDrawer: data.open_cash_drawer ?? false,
      gstNumber: data.gst_number || '134-889-012',
      isEnabled: data.is_enabled ?? true,
    };
  } catch (e) {
    console.error('Error fetching printer settings:', e);
    return DEFAULT_PRINTER_SETTINGS;
  }
}

export async function savePrinterSettings(
  restaurantId: string,
  settings: PrinterSettings,
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('restaurant_printer_settings')
    .upsert({
      restaurant_id: restaurantId,
      printer_ip: settings.printerIp,
      printer_port: settings.printerPort,
      paper_width_mm: settings.paperWidthMm,
      auto_print_kitchen_docket: settings.autoPrintKitchenDocket,
      auto_print_customer_receipt: settings.autoPrintCustomerReceipt,
      print_station_filter: settings.printStationFilter,
      cutPaper: settings.cutPaper,
      open_cash_drawer: settings.openCashDrawer,
      gst_number: settings.gstNumber,
      is_enabled: settings.isEnabled,
      updated_at: new Date().toISOString(),
    });

  if (error) throw error;
}

/**
 * Triggers Browser / System Print with dedicated receipt formatting
 */
export function triggerBrowserPrint(htmlContent: string): void {
  if (typeof window === 'undefined') return;
  const printWindow = window.open('', '_blank', 'width=380,height=600');
  if (!printWindow) {
    alert('Please allow popups to print receipt preview');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Receipt Print</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body {
            font-family: 'Courier New', Courier, monospace;
            width: 72mm;
            margin: 4mm auto;
            padding: 0;
            font-size: 12px;
            line-height: 1.3;
            color: #000;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .double-divider { border-top: 2px solid #000; margin: 6px 0; }
          .row { display: flex; justify-content: space-between; }
          .large { font-size: 16px; font-weight: bold; }
          .mod { font-size: 10px; padding-left: 10px; }
        </style>
      </head>
      <body>
        ${htmlContent}
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

/**
 * Converts printable order into clean HTML for browser printing
 */
export function generateReceiptHTML(order: PrintableOrder, restaurant: RestaurantBranding): string {
  const gstPortion = (order.total * 3) / 23;
  return `
    <div class="center bold large">${restaurant.name}</div>
    <div class="center">${restaurant.address}</div>
    <div class="center">Ph: ${restaurant.phone}</div>
    <div class="center bold" style="margin-top:4px;">GST / TAX INVOICE</div>
    <div class="center">GST No: ${restaurant.gstNumber || '134-889-012'}</div>
    <div class="divider"></div>
    <div class="row"><span>Order: ${order.id}</span><span>${new Date(order.createdAt).toLocaleDateString()}</span></div>
    <div class="row"><span>Pickup: ${order.pickupCode || order.pickupTime}</span><span>${new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
    <div>Customer: ${order.customerName}</div>
    ${order.staffName ? `<div>Served by: ${order.staffName}</div>` : ''}
    <div class="divider"></div>
    ${order.items
      .map(
        (item) => `
      <div class="row bold"><span>${item.quantity}x ${item.name}</span><span>$${item.totalPrice.toFixed(2)}</span></div>
      ${(item.modifiers || []).map((m) => `<div class="row mod"><span>+ ${m.name}</span><span>${m.price > 0 ? `+$${m.price.toFixed(2)}` : ''}</span></div>`).join('')}
    `,
      )
      .join('')}
    <div class="divider"></div>
    <div class="row"><span>Subtotal:</span><span>$${order.subtotal.toFixed(2)}</span></div>
    ${order.discount > 0 ? `<div class="row"><span>Discount:</span><span>-$${order.discount.toFixed(2)}</span></div>` : ''}
    <div class="row bold large" style="margin: 4px 0;"><span>TOTAL:</span><span>$${order.total.toFixed(2)}</span></div>
    <div class="row" style="font-size:10px;"><span>Incl. 15% GST:</span><span>$${gstPortion.toFixed(2)}</span></div>
    <div class="row" style="font-size:10px;"><span>Payment:</span><span>${order.paymentMethod.toUpperCase()} (${order.paymentStatus.toUpperCase()})</span></div>
    <div class="double-divider"></div>
    <div class="center" style="margin-top:8px;">Thank you for your order!</div>
  `;
}
