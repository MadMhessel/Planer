import React, { useRef, useEffect, useState } from 'react';
import { Bell, Check, CheckCheck, Info, AlertTriangle, AlertCircle, X } from 'lucide-react';
import { Notification } from '../types';

interface NotificationCenterProps {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  unreadCount: number;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ 
  notifications, 
  onMarkRead, 
  onMarkAllRead,
  unreadCount 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (type: string) => {
      switch(type) {
          case 'success': return <CheckCheck size={16} className="text-green-500" />;
          case 'warning': return <AlertTriangle size={16} className="text-orange-500" />;
          case 'error': return <AlertCircle size={16} className="text-red-500" />;
          default: return <Info size={16} className="text-blue-500" />;
      }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 relative rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-gray-800 animate-pulse" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
            <h3 className="font-semibold text-gray-800 dark:text-white text-sm">Уведомления</h3>
            {unreadCount > 0 && (
                <button 
                    onClick={onMarkAllRead}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                >
                    Прочитать все
                </button>
            )}
          </div>

          <div className="max-h-[300px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400 dark:text-gray-500 flex flex-col items-center">
                  <Bell size={32} className="opacity-20 mb-2" />
                  <span className="text-sm">Нет новых уведомлений</span>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {notifications.map(notification => (
                  <div 
                    key={notification.id} 
                    className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex gap-3 ${!notification.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                    onClick={() => !notification.isRead && onMarkRead(notification.id)}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                        {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className={`text-sm text-gray-800 dark:text-gray-200 leading-snug ${!notification.isRead ? 'font-medium' : ''}`}>
                            {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            {new Date(notification.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            {' • '}
                            {new Date(notification.createdAt).toLocaleDateString()}
                        </p>
                    </div>
                    {!notification.isRead && (
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};