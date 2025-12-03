import React, { useMemo } from 'react';
import { Bell, CheckCircle2, Circle, Trash2 } from 'lucide-react';
import { Notification } from '../types';
import { getRelativeTime, formatMoscowDate } from '../utils/dateUtils';

type Props = {
  notifications: Notification[];
  currentUserId: string | null;
  onMarkAsRead?: (notificationId: string) => void;
  onDelete?: (notificationId: string) => void;
};

export const NotificationHistory: React.FC<Props> = ({
  notifications,
  currentUserId,
  onMarkAsRead,
  onDelete
}) => {
  // Сортируем уведомления: сначала непрочитанные, потом по дате (новые сверху)
  const sortedNotifications = useMemo(() => {
    return [...notifications].sort((a, b) => {
      const aIsRead = currentUserId ? a.readBy?.includes(currentUserId) : false;
      const bIsRead = currentUserId ? b.readBy?.includes(currentUserId) : false;
      
      // Сначала непрочитанные
      if (aIsRead !== bIsRead) {
        return aIsRead ? 1 : -1;
      }
      
      // Потом по дате (новые сверху)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [notifications, currentUserId]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => 
      currentUserId ? !n.readBy?.includes(currentUserId) : !n.readBy?.length
    ).length;
  }, [notifications, currentUserId]);

  const formatDate = (dateString: string) => {
    return getRelativeTime(dateString);
  };

  const getTypeColor = (type: Notification['type']) => {
    switch (type) {
      case 'TASK_ASSIGNED':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      case 'TASK_UPDATED':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
      case 'PROJECT_UPDATED':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      case 'SYSTEM':
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
      case 'AI':
        return 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300';
      default:
        return 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300';
    }
  };

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-sky-500 dark:text-sky-400" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-sky-500 to-indigo-600 dark:from-sky-400 dark:to-indigo-400 bg-clip-text text-transparent">
            История уведомлений
          </h1>
          {unreadCount > 0 && (
            <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-sm font-bold">
              {unreadCount} новых
            </span>
          )}
        </div>
      </div>

      {/* Список уведомлений */}
      <div className="space-y-2">
        {sortedNotifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-slate-600" />
            <p className="text-gray-600 dark:text-slate-400">Нет уведомлений</p>
          </div>
        ) : (
          sortedNotifications.map(notification => {
            const isRead = currentUserId ? notification.readBy?.includes(currentUserId) : false;
            const notificationId = notification.id || '';

            return (
              <div
                key={notificationId}
                className={`p-4 rounded-xl border transition-all ${
                  isRead
                    ? 'bg-white dark:bg-slate-900/40 border-gray-200 dark:border-slate-700/50'
                    : 'bg-blue-50 dark:bg-slate-800/50 border-blue-200 dark:border-blue-700/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Иконка статуса */}
                  <div className="flex-shrink-0 mt-0.5">
                    {isRead ? (
                      <CheckCircle2 className="w-5 h-5 text-gray-400 dark:text-slate-600" />
                    ) : (
                      <Circle className="w-5 h-5 text-sky-500 dark:text-sky-400 fill-current" />
                    )}
                  </div>

                  {/* Содержимое */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`font-semibold text-sm ${
                          isRead 
                            ? 'text-gray-700 dark:text-slate-300' 
                            : 'text-gray-900 dark:text-slate-100'
                        }`}>
                          {notification.title}
                        </h3>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${getTypeColor(notification.type)}`}>
                          {notification.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!isRead && onMarkAsRead && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (notificationId) {
                                onMarkAsRead(notificationId);
                              }
                            }}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-400 transition-all"
                            title="Отметить как прочитанное"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (notificationId) {
                                onDelete(notificationId);
                              }
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-all"
                            title="Удалить"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-500">
                      <span>{formatDate(notification.createdAt)}</span>
                      {notification.recipients && notification.recipients.length > 0 && (
                        <>
                          <span>•</span>
                          <span>{notification.recipients.length} получателей</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

