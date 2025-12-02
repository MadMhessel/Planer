import { logger } from '../utils/logger';

export class PushService {
  private static swRegistration: ServiceWorkerRegistration | null = null;

  /**
   * Register service worker and subscribe to push
   */
  static async init(): Promise<PushSubscription | null> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      logger.warn('Push notifications not supported');
      return null;
    }

    try {
      // Register service worker
      this.swRegistration = await navigator.serviceWorker.register('/sw.js');
      logger.info('Service worker registered');

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      
      return null; // User must explicitly request permission
    } catch (error) {
      logger.error('Service worker registration failed', error);
      return null;
    }
  }

  /**
   * Request permission and subscribe to push notifications
   */
  static async subscribe(): Promise<PushSubscription | null> {
    if (!this.swRegistration) {
      logger.error('Service worker not registered');
      return null;
    }

    try {
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        logger.warn('Push notification permission denied');
        return null;
      }

      // Get VAPID public key from server
      const response = await fetch('/api/push/vapid-public-key');
      const { publicKey } = await response.json();

      // Subscribe to push
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(publicKey)
      });

      logger.info('Push subscription created');
      return subscription;
    } catch (error) {
      logger.error('Push subscription failed', error);
      return null;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  static async unsubscribe(): Promise<void> {
    if (!this.swRegistration) return;

    try {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        logger.info('Push subscription removed');
      }
    } catch (error) {
      logger.error('Push unsubscribe failed', error);
    }
  }

  /**
   * Get current push subscription
   */
  static async getSubscription(): Promise<PushSubscription | null> {
    if (!this.swRegistration) return null;

    try {
      return await this.swRegistration.pushManager.getSubscription();
    } catch (error) {
      logger.error('Failed to get push subscription', error);
      return null;
    }
  }

  /**
   * Send a test push notification
   */
  static async sendTestPush(subscription: PushSubscription): Promise<boolean> {
    try {
      const response = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription,
          title: 'Тест уведомлений',
          message: 'Push-уведомления работают!'
        })
      });

      return response.ok;
    } catch (error) {
      logger.error('Test push failed', error);
      return false;
    }
  }

  /**
   * Convert VAPID key from base64 to Uint8Array
   */
  private static urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

