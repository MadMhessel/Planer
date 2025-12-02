import React from 'react';
import { KanbanSquare, Calendar, ListTodo, LayoutDashboard } from 'lucide-react';

type AppView = 'BOARD' | 'CALENDAR' | 'GANTT' | 'LIST' | 'DASHBOARD' | 'SETTINGS';

type BottomNavProps = {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
  onCreateTask: () => void;
};

const mainViews: { id: AppView; label: string; icon: React.ComponentType<any> }[] = [
  { id: 'BOARD', label: 'Доска', icon: KanbanSquare },
  { id: 'CALENDAR', label: 'Календарь', icon: Calendar },
  { id: 'LIST', label: 'Список', icon: ListTodo },
  { id: 'DASHBOARD', label: 'Аналитика', icon: LayoutDashboard },
];

export const BottomNav: React.FC<BottomNavProps> = ({
  currentView,
  onViewChange,
  onCreateTask
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 md:hidden shadow-lg safe-area-bottom">
      <div className="flex items-center justify-around px-0.5 sm:px-1 md:px-2 py-1 sm:py-1.5 md:py-2 max-w-full overflow-x-hidden">
        {mainViews.map(btn => {
          const Icon = btn.icon;
          const active = currentView === btn.id;
          return (
            <button
              key={btn.id}
              onClick={() => onViewChange(btn.id)}
              className={`flex flex-col items-center gap-0.5 sm:gap-1 px-1 sm:px-1.5 md:px-2 py-1 sm:py-1.5 md:py-2 rounded-lg transition-all min-w-0 flex-1 touch-manipulation min-h-[44px] sm:min-h-[48px] justify-center ${
                active
                  ? 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20'
                  : 'text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'
              }`}
              aria-label={btn.label}
            >
              <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${active ? 'scale-110' : ''}`} />
              <span className="text-[8px] sm:text-[9px] md:text-[10px] font-medium truncate w-full text-center leading-tight">{btn.label}</span>
            </button>
          );
        })}
        <button
          onClick={onCreateTask}
          className="flex flex-col items-center gap-0.5 sm:gap-1 px-1 sm:px-1.5 md:px-2 py-1 sm:py-1.5 md:py-2 rounded-lg text-sky-600 dark:text-sky-400 min-w-0 flex-shrink-0 touch-manipulation min-h-[44px] sm:min-h-[48px] justify-center"
          aria-label="Создать задачу"
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg active:scale-95 transition-transform">
            <span className="text-white font-bold text-xs sm:text-sm md:text-base">+</span>
          </div>
          <span className="text-[8px] sm:text-[9px] md:text-[10px] font-medium truncate w-full text-center leading-tight">Создать</span>
        </button>
      </div>
    </nav>
  );
};

