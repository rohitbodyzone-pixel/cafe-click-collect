export type NotificationEventType =
  | 'order_created'
  | 'order_accepted'
  | 'order_preparing'
  | 'order_ready'
  | 'order_delayed'
  | 'order_cancelled'
  | 'rush_alert'
  | 'promo_announcement';

export interface PushNotificationPayload {
  title: string;
  body: string;
  eventType: NotificationEventType;
  orderId?: string;
  restaurantId: string;
  data?: Record<string, any>;
  sound?: string;
  badge?: number;
}

export interface DeviceTokenRecord {
  id?: string;
  restaurantId: string;
  customerKey?: string;
  userId?: string;
  deviceToken: string;
  platform: 'web' | 'ios' | 'android';
  notificationPreferences: {
    order_updates: boolean;
    promotions: boolean;
  };
}
