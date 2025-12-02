import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Volume2, VolumeX } from 'lucide-react';
import { UserNotificationSettings } from '../types';
import { PushService } from '../services/push';
import { logger } from '../utils/logger';
import toast from 'react-hot-toast';

interface Props {
  settings: UserNotificationSettings;
  onUpdate: (settings: UserNotificationSettings) => Promise<void>;
}

export const NotificationSettings: React.FC<Props> = ({ settings, onUpdate }) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [pushSubscription, setPushSubscription] = useState<PushSubscription | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load current push subscription
    PushService.getSubscription().then(setPushSubscription);
  }, []);

  const handleToggle = async (channel: 'telegram' | 'push' | 'email', value: boolean) => {
    const newSettings = {
      ...localSettings,
      channels: {
        ...localSettings.channels,
        [channel]: value
      }
    };

    // If enabling push, request subscription
    if (channel === 'push' && value && !pushSubscription) {
      setLoading(true);
      const subscription = await PushService.subscribe();
      setLoading(false);

      if (!subscription) {
        toast.error('Не удалось подключить push-уведомления');
        return;
      }

      setPushSubscription(subscription);
      toast.success('Push-уведомления включены');
    }

    // If disabling push, unsubscribe
    if (channel === 'push' && !value && pushSubscription) {
      await PushService.unsubscribe();
      setPushSubscription(null);
      toast.success('Push-уведомления отключены');
    }

    setLocalSettings(newSettings);
    await onUpdate(newSettings);
  };

  const handleSoundToggle = async () => {
    const newSettings = {
      ...localSettings,
      soundEnabled: !localSettings.soundEnabled
    };
    setLocalSettings(newSettings);
    await onUpdate(newSettings);
  };

  const handleTestPush = async () => {
    if (!pushSubscription) {
      toast.error('Push-уведомления не подключены');
      return;
    }

    setLoading(true);
    const success = await PushService.sendTestPush(pushSubscription);
    setLoading(false);

    if (success) {
      toast.success('Тестовое уведомление отправлено');
    } else {
      toast.error('Не удалось отправить тестовое уведомление');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Каналы уведомлений
        </h3>

        {/* Telegram */}
        <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-sky-500" />
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Telegram</div>
              <div className="text-sm text-gray-500 dark:text-slate-400">
                Уведомления в Telegram бот
              </div>
            </div>
          </div>
          <button
            onClick={() => handleToggle('telegram', !localSettings.channels.telegram)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              localSettings.channels.telegram ? 'bg-sky-500' : 'bg-gray-300 dark:bg-slate-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                localSettings.channels.telegram ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Web Push */}
        <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <BellOff className="w-5 h-5 text-indigo-500" />
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Push-уведомления</div>
              <div className="text-sm text-gray-500 dark:text-slate-400">
                Уведомления в браузере
              </div>
            </div>
          </div>
          <button
            onClick={() => handleToggle('push', !localSettings.channels.push)}
            disabled={loading}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              localSettings.channels.push ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-slate-600'
            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                localSettings.channels.push ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Test Push Button */}
        {localSettings.channels.push && pushSubscription && (
          <div className="mt-3">
            <button
              onClick={handleTestPush}
              disabled={loading}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50"
            >
              Отправить тестовое уведомление
            </button>
          </div>
        )}

        {/* Sound */}
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            {localSettings.soundEnabled ? (
              <Volume2 className="w-5 h-5 text-green-500" />
            ) : (
              <VolumeX className="w-5 h-5 text-gray-400" />
            )}
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Звук</div>
              <div className="text-sm text-gray-500 dark:text-slate-400">
                Звуковые уведомления
              </div>
            </div>
          </div>
          <button
            onClick={handleSoundToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              localSettings.soundEnabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                localSettings.soundEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

