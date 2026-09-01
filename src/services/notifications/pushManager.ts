import { supabase } from '@/src/lib/supabase';
import { DeviceTokenRecord, PushNotificationPayload } from './types';

/**
 * Registers a client device token in Supabase
 */
export async function registerDevicePushToken(record: DeviceTokenRecord): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('device_push_tokens')
      .upsert(
        {
          restaurant_id: record.restaurantId,
          customer_key: record.customerKey || null,
          user_id: record.userId || null,
          device_token: record.deviceToken,
          platform: record.platform,
          notification_preferences: record.notificationPreferences,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'restaurant_id,device_token' },
      );

    if (error) throw error;
  } catch (e) {
    console.error('Failed to register device push token:', e);
  }
}

/**
 * Requests browser Web Push notification permission
 */
export async function requestNotificationPermission(): Promise<'granted' | 'denied' | 'default'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (e) {
    console.warn('Could not request notification permission:', e);
    return 'denied';
  }
}

/**
 * Dispatches a client notification (with browser notification and audio chime)
 */
export function showLocalNotification(payload: PushNotificationPayload): void {
  // 1. Browser Native Notification
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(payload.title, {
        body: payload.body,
        icon: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=128&q=80',
        data: payload.data,
      });
    } catch (e) {
      console.warn('Browser notification error:', e);
    }
  }

  // 2. Audio Chime (Synthesized Web Audio)
  playNotificationSound(payload.eventType);
}

function playNotificationSound(type: string): void {
  if (typeof window === 'undefined' || !window.AudioContext) return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'order_ready') {
      // Cheerful high-pitch chime (Ready)
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880.0, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } else {
      // Soft gentle tap (Order Update)
      osc.frequency.setValueAtTime(440.0, ctx.currentTime); // A4
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    }
  } catch {
    // Audio context may be restricted before user gesture
  }
}
