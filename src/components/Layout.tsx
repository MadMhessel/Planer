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
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void;
  canManageCurrentWorkspace: boolean;
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
  onThemeChange,
  canManageCurrentWorkspace,
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

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Верхняя панель */}
      <header className="border-b border-slate-700 bg-slate-900/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-3">
          {/* Логотип / название */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-500 flex items-center justify-center text-sm font-bold">
              CTP
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-semibold text-sm">Command Task Planner</span>
              <span className="text-xs text-slate-400">Командный планировщик задач</span>
            </div>
          </div>

          {/* Рабочие пространства */}
          <div className="ml-4 flex items-center gap-2">
            <div className="relative">
              <select
                className="bg-slate-800 border border-slate-700 rounded-md text-sm px-2 py-1 pr-6"
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
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-1.5 top-1.5 pointer-events-none" />
            </div>
            <button
              onClick={handleCreateWorkspaceClick}
              className="text-xs px-2 py-1 rounded-md border border-slate-600 hover:bg-slate-800"
            >
              + Создать
            </button>
          </div>

          {/* Центр — переключение представлений */}
          <nav className="ml-6 hidden md:flex items-center gap-1 text-xs">
            {viewButtons.map(btn => {
              const Icon = btn.icon;
              const active = view === btn.id;
              return (
                <button
                  key={btn.id}
                  onClick={() => onChangeView(btn.id)}
                  className={
                    'flex items-center gap-1 px-2 py-1 rounded-md transition ' +
                    (active
                      ? 'bg-sky-500 text-slate-900'
                      : 'text-slate-300 hover:bg-slate-800')
                  }
                >
                  <Icon className="w-3 h-3" />
                  <span>{btn.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Справа */}
          <div className="ml-auto flex items-center gap-3">
            {/* Переключатель темы */}
            <div className="flex items-center gap-1 bg-slate-800 rounded-full p-0.5 text-xs">
              <button
                onClick={() => handleThemeClick('light')}
                className="p-1 rounded-full hover:bg-slate-700"
                title="Светлая"
              >
                <Sun className="w-3 h-3" />
              </button>
              <button
                onClick={() => handleThemeClick('system')}
                className="p-1 rounded-full hover:bg-slate-700"
                title="Системная"
              >
                <Monitor className="w-3 h-3" />
              </button>
              <button
                onClick={() => handleThemeClick('dark')}
                className="p-1 rounded-full hover:bg-slate-700"
                title="Тёмная"
              >
                <Moon className="w-3 h-3" />
              </button>
            </div>

            {/* Уведомления */}
            <div className="relative">
              <button
                className="relative p-1 rounded-full hover:bg-slate-800"
                title="Уведомления"
              >
                <Bell className="w-5 h-5 text-slate-300" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-[10px] rounded-full min-w-[16px] h-[16px] flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </div>

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
                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs border border-slate-600 hover:bg-slate-800"
              >
                <LogOut className="w-3 h-3" />
                <span className="hidden sm:inline">Выйти</span>
              </button>
            </div>
          </div>
        </div>

        {/* Навигация по видам для мобилки */}
        <div className="md:hidden px-2 pb-2">
          <div className="flex flex-wrap gap-1 text-[11px]">
            {viewButtons.map(btn => {
              const Icon = btn.icon;
              const active = view === btn.id;
              return (
                <button
                  key={btn.id}
                  onClick={() => onChangeView(btn.id)}
                  className={
                    'flex items-center gap-1 px-2 py-1 rounded-md transition ' +
                    (active
                      ? 'bg-sky-500 text-slate-900'
                      : 'text-slate-300 bg-slate-800')
                  }
                >
                  <Icon className="w-3 h-3" />
                  <span>{btn.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Основной контент */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-2 sm:px-4 py-3">
        {children}
      </main>
    </div>
  );
};
