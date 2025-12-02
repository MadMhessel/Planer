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
      <div className="flex items-center justify-around px-1 sm:px-2 py-1.5 sm:py-2 max-w-full overflow-x-hidden">
        {mainViews.map(btn => {
          const Icon = btn.icon;
          const active = currentView === btn.id;
          return (
            <button
              key={btn.id}
              onClick={() => onViewChange(btn.id)}
              className={`flex flex-col items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 md:px-3 py-1 sm:py-1.5 md:py-2 rounded-lg transition-all min-w-0 flex-1 ${
                active
                  ? 'text-sky-600 dark:text-sky-400'
                  : 'text-gray-500 dark:text-slate-400'
              }`}
            >
              <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${active ? 'scale-110' : ''}`} />
              <span className="text-[9px] sm:text-[10px] font-medium truncate w-full text-center">{btn.label}</span>
            </button>
          );
        })}
        <button
          onClick={onCreateTask}
          className="flex flex-col items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 md:px-3 py-1 sm:py-1.5 md:py-2 rounded-lg text-sky-600 dark:text-sky-400 min-w-0 flex-shrink-0"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-sm sm:text-base md:text-lg">+</span>
          </div>
          <span className="text-[9px] sm:text-[10px] font-medium truncate w-full text-center">Создать</span>
        </button>
      </div>
    </nav>
  );
};

