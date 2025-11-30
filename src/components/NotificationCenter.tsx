import React, { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { Notification } from '../types';

type Props = {
  notifications: Notification[];
  onClear: () => void;
  isOpen?: boolean;
  onToggle?: () => void;
};

export const NotificationCenter: React.FC<Props> = ({
  notifications,
  onClear,
  isOpen: controlledOpen,
  onToggle
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onToggle || setInternalOpen;

  const unread = notifications.filter(n => !n.read);

  return (
    <>
      {/* Плавающая кнопка колокольчика (только для мобильных) */}
      {onToggle && (
        <button
          onClick={onToggle}
          className="fixed bottom-4 right-4 z-30 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 text-white p-4 shadow-xl shadow-sky-500/40 hover:shadow-2xl hover:shadow-sky-500/50 hover:scale-110 transition-all md:hidden"
        >
          <Bell className="w-5 h-5" />
          {unread.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-[10px] font-bold text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center shadow-lg shadow-red-500/50 animate-pulse">
              {unread.length > 9 ? '9+' : unread.length}
            </span>
          )}
        </button>
      )}

      {/* Панель уведомлений */}
      {open && (
        <div className="fixed inset-x-0 bottom-0 md:bottom-4 md:right-4 md:left-auto md:w-96 z-30 animate-slide-up">
          <div className="mx-2 mb-2 md:mx-0 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 shadow-2xl max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-slate-900/50 rounded-t-2xl">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Bell className="w-5 h-5 text-sky-400" />
                <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">Уведомления</span>
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
                    className="px-2 py-1 rounded-md hover:bg-slate-800 hover:text-slate-200 transition-all font-medium"
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
                  className="p-1.5 rounded-md hover:bg-slate-800 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto text-xs">
              {notifications.length === 0 && (
                <div className="px-4 py-8 text-center text-slate-400">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Пока нет уведомлений</p>
                </div>
              )}

              {notifications.map(n => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b border-slate-800/50 last:border-b-0 hover:bg-slate-800/30 transition-all ${!n.read ? 'bg-slate-800/20' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-100 text-sm">
                          {n.title}
                        </span>
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                        )}
                      </div>
                      <p className="text-slate-300 text-xs leading-relaxed">
                        {n.message}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-500 whitespace-nowrap">
                      {new Date(n.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
