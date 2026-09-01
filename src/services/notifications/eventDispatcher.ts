import { PushNotificationPayload } from './types';
import { showLocalNotification } from './pushManager';

export const NotificationEvents = {
  notifyOrderCreated(restaurantId: string, orderId: string, customerName: string, itemsCount: number): PushNotificationPayload {
    const payload: PushNotificationPayload = {
      restaurantId,
      orderId,
      eventType: 'order_created',
      title: '🔔 New Incoming Order!',
      body: `${customerName} placed order #${orderId.slice(-5)} (${itemsCount} items).`,
      data: { orderId, screen: '/kitchen' },
    };
    showLocalNotification(payload);
    return payload;
  },

  notifyOrderAccepted(restaurantId: string, orderId: string, pickupTime: string): PushNotificationPayload {
    const payload: PushNotificationPayload = {
      restaurantId,
      orderId,
      eventType: 'order_accepted',
      title: 'Order Confirmed! ☕',
      body: `Your order has been accepted. Estimated pickup: ${pickupTime}.`,
      data: { orderId, screen: '/order-status' },
    };
    showLocalNotification(payload);
    return payload;
  },

  notifyOrderPreparing(restaurantId: string, orderId: string): PushNotificationPayload {
    const payload: PushNotificationPayload = {
      restaurantId,
      orderId,
      eventType: 'order_preparing',
      title: 'Now Brewing! 🔥',
      body: `The barista is currently preparing your order.`,
      data: { orderId, screen: '/order-status' },
    };
    showLocalNotification(payload);
    return payload;
  },

  notifyOrderReady(restaurantId: string, orderId: string, pickupCode: string): PushNotificationPayload {
    const payload: PushNotificationPayload = {
      restaurantId,
      orderId,
      eventType: 'order_ready',
      title: '🎉 Order Ready for Pickup!',
      body: `Your order #${orderId.slice(-5)} is waiting at the counter. Pickup Code: ${pickupCode}`,
      data: { orderId, screen: '/order-status' },
      sound: 'order_ready.wav',
    };
    showLocalNotification(payload);
    return payload;
  },

  notifyOrderDelayed(restaurantId: string, orderId: string, extraMinutes: number): PushNotificationPayload {
    const payload: PushNotificationPayload = {
      restaurantId,
      orderId,
      eventType: 'order_delayed',
      title: 'Kitchen Update: +Prep Time',
      body: `Due to high in-store volume, your order may take an extra ~${extraMinutes} minutes. Thank you for your patience!`,
      data: { orderId, screen: '/order-status' },
    };
    showLocalNotification(payload);
    return payload;
  },

  notifyOrderCancelled(restaurantId: string, orderId: string, reason?: string): PushNotificationPayload {
    const payload: PushNotificationPayload = {
      restaurantId,
      orderId,
      eventType: 'order_cancelled',
      title: 'Order Cancelled',
      body: `Order #${orderId.slice(-5)} was cancelled.${reason ? ` Reason: ${reason}` : ''}`,
      data: { orderId, screen: '/orders' },
    };
    showLocalNotification(payload);
    return payload;
  },

  notifyOperationalAlert(restaurantId: string, title: string, message: string): PushNotificationPayload {
    const payload: PushNotificationPayload = {
      restaurantId,
      eventType: 'rush_alert',
      title: `⚠️ ${title}`,
      body: message,
      data: { screen: '/manager' },
    };
    showLocalNotification(payload);
    return payload;
  },
};
