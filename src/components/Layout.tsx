import React, { useState } from 'react';
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
  ChevronDown,
  Menu,
  X,
  Plus
} from 'lucide-react';
import { Workspace, User, ViewMode, Notification } from '../types';
import { MobileDrawer } from './MobileDrawer';
import { BottomNav } from './BottomNav';

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
  onCreateTask?: () => void;
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
  onCreateTask,
  children
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
      : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-400');

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 flex flex-col">
      {/* Mobile Drawer */}
      <MobileDrawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        currentView={view}
        onViewChange={onChangeView}
      />

      {/* Header - Mobile First */}
      <header className="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto">
          {/* Top Row - Logo, Menu, Actions */}
          <div className="flex items-center justify-between px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 gap-1 sm:gap-2 overflow-hidden">
            {/* Left: Logo + Menu Button (Mobile) */}
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0 min-w-0">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300"
                aria-label="Меню"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Logo */}
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-xs sm:text-sm font-bold text-white shadow-lg shadow-sky-500/30">
                  CTP
                </div>
                <div className="hidden sm:flex flex-col leading-tight">
                  <span className="font-bold text-xs sm:text-sm bg-gradient-to-r from-sky-500 to-indigo-600 dark:from-sky-400 dark:to-indigo-400 bg-clip-text text-transparent">
                    Command Task Planner
                  </span>
                  <span className="text-[10px] text-gray-500 dark:text-slate-400">Командный планировщик</span>
                </div>
              </div>
            </div>

            {/* Center: Workspace Selector - Always visible on mobile */}
            <div className="flex items-center gap-1 sm:gap-1.5 flex-1 max-w-[140px] sm:max-w-xs mx-0.5 sm:mx-1 md:mx-2 min-w-0 overflow-hidden">
              <div className="relative flex-1 min-w-0">
                <select
                  className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-[9px] sm:text-[10px] md:text-xs px-1 sm:px-1.5 md:px-2 py-0.5 sm:py-1 md:py-1.5 pr-4 sm:pr-5 md:pr-6 focus:ring-1 focus:ring-sky-500/50 focus:border-sky-500 transition-all text-gray-900 dark:text-slate-100 truncate appearance-none"
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
                <ChevronDown className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 text-gray-400 dark:text-slate-500 absolute right-0.5 sm:right-1 md:right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <button
                onClick={handleCreateWorkspaceClick}
                className="text-[8px] sm:text-[9px] md:text-[10px] px-1 sm:px-1.5 md:px-2 py-0.5 sm:py-1 md:py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all font-medium text-gray-700 dark:text-slate-300 whitespace-nowrap flex-shrink-0"
                title="Создать пространство"
              >
                + Новое
              </button>
            </div>

            {/* Right: Theme, Notifications, User */}
            <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 flex-shrink-0">
              {/* Theme Toggle - Compact on Mobile */}
              <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-slate-800 rounded-full p-0.5 text-[10px] sm:text-xs border border-gray-200 dark:border-slate-700">
                <button
                  onClick={() => handleThemeClick('light')}
                  type="button"
                  className={themeButtonClasses('light')}
                  aria-pressed={currentTheme === 'light'}
                  title="Светлая"
                >
                  <Sun className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
                <button
                  onClick={() => handleThemeClick('system')}
                  type="button"
                  className={themeButtonClasses('system')}
                  aria-pressed={currentTheme === 'system'}
                  title="Системная"
                >
                  <Monitor className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
                <button
                  onClick={() => handleThemeClick('dark')}
                  type="button"
                  className={themeButtonClasses('dark')}
                  aria-pressed={currentTheme === 'dark'}
                  title="Тёмная"
                >
                  <Moon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              </div>

              {/* Notifications */}
              {onNotificationsToggle && (
                <div className="relative">
                  <button
                    onClick={onNotificationsToggle}
                    className="relative p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-all text-gray-600 dark:text-slate-400"
                    title="Уведомления"
                  >
                    <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-[9px] font-bold text-white rounded-full min-w-[16px] h-[16px] flex items-center justify-center shadow-lg animate-pulse px-1">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                </div>
              )}

              {/* User Menu - Compact on Mobile */}
              <div className="hidden sm:flex items-center gap-2">
                <div className="flex flex-col text-xs leading-tight">
                  <span className="font-medium text-gray-900 dark:text-slate-100">
                    {currentUser.displayName || currentUser.email}
                  </span>
                  {currentWorkspace && (
                    <span className="text-gray-500 dark:text-slate-400 truncate max-w-[120px] text-[10px]">
                      {currentWorkspace.name}
                    </span>
                  )}
                </div>
                <button
                  onClick={onLogout}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all font-medium text-gray-700 dark:text-slate-300"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Выйти</span>
                </button>
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1.5 px-4 pb-2 text-xs border-t border-gray-100 dark:border-slate-800">
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
                      : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-slate-100')
                  }
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{btn.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-2 sm:px-3 md:px-4 lg:px-6 py-3 sm:py-4 pb-20 md:pb-4 overflow-x-hidden">
        <div className="w-full max-w-full overflow-x-hidden">
          {children}
        </div>
      </main>

      {/* FAB - Floating Action Button for Create Task (Desktop) */}
      {onCreateTask && (
        <button
          onClick={onCreateTask}
          className="hidden md:flex fixed bottom-6 right-6 z-30 items-center justify-center w-14 h-14 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-xl shadow-sky-500/40 hover:shadow-2xl hover:shadow-sky-500/50 hover:scale-110 transition-all font-semibold"
          aria-label="Создать задачу"
          title="Создать задачу"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Bottom Navigation - Mobile Only */}
      {onCreateTask && (
        <BottomNav
          currentView={view}
          onViewChange={onChangeView}
          onCreateTask={onCreateTask}
        />
      )}
    </div>
  );
};
