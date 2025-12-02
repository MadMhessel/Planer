import React from 'react';
import { X, KanbanSquare, Calendar, BarChart3, ListTodo, LayoutDashboard, Settings, User as UserIcon } from 'lucide-react';

type AppView = 'BOARD' | 'CALENDAR' | 'GANTT' | 'LIST' | 'DASHBOARD' | 'SETTINGS';

type MobileDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  currentView: AppView;
  onViewChange: (view: AppView) => void;
  onProfileClick?: () => void;
};

const viewButtons: { id: AppView; label: string; icon: React.ComponentType<any> }[] = [
  { id: 'BOARD', label: 'Доска', icon: KanbanSquare },
  { id: 'CALENDAR', label: 'Календарь', icon: Calendar },
  { id: 'GANTT', label: 'Гант', icon: BarChart3 },
  { id: 'LIST', label: 'Список', icon: ListTodo },
  { id: 'DASHBOARD', label: 'Аналитика', icon: LayoutDashboard },
  { id: 'SETTINGS', label: 'Настройки', icon: Settings }
];

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  currentView,
  onViewChange,
  onProfileClick
}) => {
  if (!isOpen) return null;

  const handleViewClick = (view: AppView) => {
    onViewChange(view);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden animate-fade-in"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-900 z-50 md:hidden shadow-2xl transform transition-transform duration-300 ease-in-out">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Меню</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-2 py-4">
            {viewButtons.map(btn => {
              const Icon = btn.icon;
              const active = currentView === btn.id;
              return (
                <button
                  key={btn.id}
                  onClick={() => handleViewClick(btn.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-all ${
                    active
                      ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-lg'
                      : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{btn.label}</span>
                </button>
              );
            })}
            
            {/* Profile Button */}
            {onProfileClick && (
              <button
                onClick={() => {
                  onProfileClick();
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-all text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 border-t border-gray-200 dark:border-slate-700 mt-4 pt-4"
              >
                <UserIcon className="w-5 h-5" />
                <span className="font-medium">Профиль</span>
              </button>
            )}
          </nav>
        </div>
      </div>
    </>
  );
};

