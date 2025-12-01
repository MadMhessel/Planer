import React from 'react';
import {
  Bell,
  LayoutDashboard,
  Calendar,
  KanbanSquare,
  ListTodo,
  BarChart3,
  Settings,
  LogOut,
  Sun,
  Moon,
  Monitor,
  ChevronDown
} from 'lucide-react';
import { Workspace, User, ViewMode, Notification } from '../types';

type AppView = ViewMode | 'SETTINGS';

type LayoutProps = {
  currentUser: User;
  onLogout: () => void;
  view: AppView;
  onChangeView: (view: AppView) => void;
  workspaces: Workspace[];
  currentWorkspaceId: string | null;
  onWorkspaceChange: (id: string) => void;
  onCreateWorkspace: (name: string) => void;
  notifications: Notification[];
  currentTheme: 'light' | 'dark' | 'system';
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void;
  canManageCurrentWorkspace: boolean;
  onNotificationsToggle?: () => void;
  children: React.ReactNode;
};

const viewButtons: { id: AppView; label: string; icon: React.ComponentType<any> }[] = [
  { id: 'BOARD', label: 'Доска', icon: KanbanSquare },
  { id: 'CALENDAR', label: 'Календарь', icon: Calendar },
  { id: 'GANTT', label: 'Гант', icon: BarChart3 },
  { id: 'LIST', label: 'Список', icon: ListTodo },
  { id: 'DASHBOARD', label: 'Аналитика', icon: LayoutDashboard },
  { id: 'SETTINGS', label: 'Настройки', icon: Settings }
];

export const Layout: React.FC<LayoutProps> = ({
  currentUser,
  onLogout,
  view,
  onChangeView,
  workspaces,
  currentWorkspaceId,
  onWorkspaceChange,
  onCreateWorkspace,
  notifications,
  currentTheme,
  onThemeChange,
  canManageCurrentWorkspace,
  onNotificationsToggle,
  children
}) => {
  const currentWorkspace = workspaces.find(w => w.id === currentWorkspaceId) || null;

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleCreateWorkspaceClick = () => {
    const name = window.prompt('Название рабочего пространства');
    if (name && name.trim()) {
      onCreateWorkspace(name.trim());
    }
  };

  const handleThemeClick = (mode: 'light' | 'dark' | 'system') => {
    onThemeChange(mode);
  };

  const themeButtonClasses = (mode: 'light' | 'dark' | 'system') =>
    'p-1.5 rounded-full transition-all ' +
    (currentTheme === mode
      ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/40'
      : 'hover:bg-slate-700/50 text-slate-300');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col">
      {/* Верхняя панель */}
      <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-20 shadow-lg shadow-slate-900/20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center gap-4">
          {/* Логотип / название */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-sky-500/30">
              CTP
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-bold text-sm bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">Command Task Planner</span>
              <span className="text-xs text-slate-400">Командный планировщик задач</span>
            </div>
          </div>

          {/* Рабочие пространства */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap md:ml-4">
            <div className="relative">
              <select
                className="bg-slate-800/80 border border-slate-700/50 rounded-lg text-sm px-3 py-1.5 pr-8 focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition-all"
                value={currentWorkspaceId || ''}
                onChange={e => onWorkspaceChange(e.target.value)}
              >
                {workspaces.length === 0 && (
                  <option value="">Нет пространств</option>
                )}
                {workspaces.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <button
              onClick={handleCreateWorkspaceClick}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-600/50 hover:bg-slate-800/80 hover:border-slate-500 transition-all font-medium"
            >
              + Создать
            </button>
          </div>

          {/* Центр — переключение представлений */}
          <nav className="ml-0 md:ml-6 hidden md:flex items-center gap-1.5 text-xs">
            {viewButtons.map(btn => {
              const Icon = btn.icon;
              const active = view === btn.id;
              return (
                <button
                  key={btn.id}
                  onClick={() => onChangeView(btn.id)}
                  className={
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-medium ' +
                    (active
                      ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/30'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100')
                  }
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{btn.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Справа */}
          <div className="ml-auto flex items-center gap-3 flex-wrap justify-end mt-3 md:mt-0">
            {/* Переключатель темы */}
            <div className="flex items-center gap-0.5 bg-slate-800/60 rounded-full p-0.5 text-xs border border-slate-700/50">
              <button
                onClick={() => handleThemeClick('light')}
                type="button"
                className={themeButtonClasses('light')}
                aria-pressed={currentTheme === 'light'}
                title="Светлая"
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleThemeClick('system')}
                type="button"
                className={themeButtonClasses('system')}
                aria-pressed={currentTheme === 'system'}
                title="Системная"
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleThemeClick('dark')}
                type="button"
                className={themeButtonClasses('dark')}
                aria-pressed={currentTheme === 'dark'}
                title="Тёмная"
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Уведомления */}
            {onNotificationsToggle && (
              <div className="relative">
                <button
                  onClick={onNotificationsToggle}
                  className="relative p-2 rounded-lg hover:bg-slate-800/60 transition-all group"
                  title="Уведомления"
                >
                  <Bell className="w-5 h-5 text-slate-300 group-hover:text-sky-400 transition-colors" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-[10px] font-bold text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center shadow-lg shadow-red-500/50 animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* Текущий пользователь */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex flex-col text-xs leading-tight">
                <span className="font-medium">
                  {currentUser.displayName || currentUser.email}
                </span>
                {currentWorkspace && (
                  <span className="text-slate-400 truncate max-w-[120px]">
                    {currentWorkspace.name}
                  </span>
                )}
              </div>
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-slate-600/50 hover:bg-slate-800/80 hover:border-slate-500 transition-all font-medium"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Выйти</span>
              </button>
            </div>
          </div>
        </div>

        {/* Навигация по видам для мобилки */}
        <div className="md:hidden px-3 pb-3 border-t border-slate-700/50">
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            {viewButtons.map(btn => {
              const Icon = btn.icon;
              const active = view === btn.id;
              return (
                <button
                  key={btn.id}
                  onClick={() => onChangeView(btn.id)}
                  className={
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-medium ' +
                    (active
                      ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/30'
                      : 'text-slate-300 bg-slate-800/60 hover:bg-slate-800/80')
                  }
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{btn.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Основной контент */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 py-4">
        {children}
      </main>
    </div>
  );
};
