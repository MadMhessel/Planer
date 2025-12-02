import React, { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { Notification } from '../types';

type Props = {
  notifications: Notification[];
  onClear: () => void;
  onMarkAsRead?: (notificationId: string) => void;
  isOpen?: boolean;
  onToggle?: () => void;
  currentUserId?: string;
};

export const NotificationCenter: React.FC<Props> = ({
  notifications,
  onClear,
  onMarkAsRead,
  isOpen: controlledOpen,
  onToggle,
  currentUserId
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onToggle || setInternalOpen;

  const unread = notifications.filter(n => 
    currentUserId ? !n.readBy?.includes(currentUserId) : !n.readBy?.length
  );

  return (
    <>
      {/* Плавающая кнопка уведомлений скрыта, чтобы не перекрывать AI-кнопку */}

      {/* Панель уведомлений */}
      {open && (
        <div className="fixed inset-x-0 bottom-0 md:bottom-4 md:right-4 md:left-auto md:w-96 z-40 animate-slide-up">
          <div className="mx-2 mb-2 md:mx-0 rounded-2xl bg-white dark:bg-slate-900 backdrop-blur-xl border border-gray-200 dark:border-slate-700 shadow-2xl max-h-[70vh] md:max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-t-2xl">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Bell className="w-5 h-5 text-sky-500 dark:text-sky-400" />
                <span className="bg-gradient-to-r from-sky-500 to-indigo-600 dark:from-sky-400 dark:to-indigo-400 bg-clip-text text-transparent">Уведомления</span>
                {unread.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold">
                    {unread.length} новых
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                {notifications.length > 0 && (
                  <button
                    onClick={onClear}
                    className="px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-slate-200 transition-all font-medium text-gray-600 dark:text-slate-400"
                  >
                    Очистить
                  </button>
                )}
                <button
                  onClick={() => {
                    if (onToggle) {
                      onToggle();
                    } else {
                      setInternalOpen(false);
                    }
                  }}
                  className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 transition-all text-gray-600 dark:text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto text-xs">
              {notifications.length === 0 && (
                <div className="px-4 py-8 text-center text-gray-500 dark:text-slate-400">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Пока нет уведомлений</p>
                </div>
              )}

              {notifications.map(n => {
                const isRead = currentUserId ? n.readBy?.includes(currentUserId) : false;
                return (
                <div
                  key={n.id}
                  onClick={() => {
                    if (!isRead && onMarkAsRead && n.id) {
                      onMarkAsRead(n.id);
                    }
                  }}
                  className={`px-3 sm:px-4 py-2.5 sm:py-3 border-b border-gray-200 dark:border-slate-800 last:border-b-0 hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-all cursor-pointer ${!isRead ? 'bg-blue-50 dark:bg-slate-800/20' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 dark:text-slate-100 text-xs sm:text-sm truncate">
                          {n.title}
                        </span>
                        {!isRead && (
                          <span className="w-2 h-2 rounded-full bg-sky-500 flex-shrink-0"></span>
                        )}
                      </div>
                      <p className="text-gray-600 dark:text-slate-300 text-[11px] sm:text-xs leading-relaxed line-clamp-2">
                        {n.message}
                      </p>
                    </div>
                    <span className="text-[10px] text-gray-500 dark:text-slate-500 whitespace-nowrap flex-shrink-0">
                      {new Date(n.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                </div>
              );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
