import React, { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { Notification } from '../types';

type Props = {
  notifications: Notification[];
  onClear: () => void;
};

export const NotificationCenter: React.FC<Props> = ({
  notifications,
  onClear
}) => {
  const [open, setOpen] = useState(false);

  const unread = notifications.filter(n => !n.read);

  return (
    <>
      {/* Плавающая кнопка колокольчика */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-4 right-4 z-30 rounded-full bg-sky-500 text-slate-900 p-3 shadow-lg hover:bg-sky-400 md:hidden"
      >
        <Bell className="w-5 h-5" />
        {unread.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-[10px] text-white rounded-full min-w-[16px] h-[16px] flex items-center justify-center">
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </button>

      {/* Панель уведомлений */}
      {open && (
        <div className="fixed inset-x-0 bottom-0 md:bottom-4 md:right-4 md:left-auto md:w-80 z-30">
          <div className="mx-2 mb-2 md:mx-0 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl max-h-[60vh] flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Bell className="w-4 h-4" />
                <span>Уведомления</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                {notifications.length > 0 && (
                  <button
                    onClick={onClear}
                    className="hover:text-slate-200"
                  >
                    Очистить
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-md hover:bg-slate-700"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto text-xs">
              {notifications.length === 0 && (
                <div className="px-3 py-4 text-slate-400">
                  Пока нет уведомлений.
                </div>
              )}

              {notifications.map(n => (
                <div
                  key={n.id}
                  className="px-3 py-2 border-b border-slate-800 last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-100">
                      {n.title}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 text-slate-300">
                    {n.message}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
