import { useState, useEffect, useCallback } from 'react';
import { Notification } from '../types';
import { NotificationsService } from '../services/notifications';
import { logger } from '../utils/logger';

export const useNotifications = (
  workspaceId: string | null,
  userId: string | null
) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!workspaceId || !userId) {
      setNotifications([]);
      return;
    }

    setLoading(true);
    try {
      const unsubscribe = NotificationsService.subscribe(
        workspaceId,
        userId,
        (newNotifications) => {
          setNotifications(newNotifications);
          setLoading(false);
        }
      );

      return () => {
        unsubscribe();
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load notifications');
      logger.error('Failed to subscribe to notifications', error);
      setError(error);
      setLoading(false);
    }
  }, [workspaceId, userId]);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!workspaceId || !userId) return;

    try {
      await NotificationsService.markAsRead(workspaceId, notificationId, userId);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to mark notification as read');
      logger.error('Failed to mark notification as read', error);
      throw error;
    }
  }, [workspaceId, userId]);

  const markAllAsRead = useCallback(async () => {
    if (!workspaceId || !userId) return;

    try {
      await NotificationsService.markAllAsRead(workspaceId, userId);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to mark all notifications as read');
      logger.error('Failed to mark all notifications as read', error);
      throw error;
    }
  }, [workspaceId, userId]);

  return {
    notifications,
    loading,
    error,
    markAsRead,
    markAllAsRead
  };
};

