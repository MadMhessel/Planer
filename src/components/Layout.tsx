import React from 'react';
import { ViewMode, User, Notification } from '../types';
import { LayoutDashboard, List, Kanban, Calendar, GitGraph, Settings, Menu, X, Command, Plus, LogOut } from 'lucide-react';
import { NotificationCenter } from './NotificationCenter';

interface LayoutProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onCreateTask: () => void;
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
  notifications: Notification[];
  onMarkNotificationRead: (id: string) => void;
  onMarkAllNotificationsRead: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
    currentView, 
    onViewChange, 
    onCreateTask, 
    children, 
    user, 
    onLogout,
    notifications,
    onMarkNotificationRead,
    onMarkAllNotificationsRead
}) => {
  const [isSidebarOpen, setSidebarOpen] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navItems = [
    { id: 'DASHBOARD' as ViewMode, icon: LayoutDashboard, label: 'Обзор' },
    { id: 'LIST' as ViewMode, icon: List, label: 'Список задач' },
    { id: 'BOARD' as ViewMode, icon: Kanban, label: 'Канбан доска' },
    { id: 'CALENDAR' as ViewMode, icon: Calendar, label: 'Календарь' },
    { id: 'GANTT' as ViewMode, icon: GitGraph, label: 'Диаграмма Ганта' },
  ];

  const handleNavClick = (view: ViewMode) => {
    onViewChange(view);
    if (isMobile) setSidebarOpen(false);
  };

  const getInitials = (name: string) => name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '??';

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden relative transition-colors duration-200">
      
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside 
        className={`
          fixed md:relative z-50 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
          transition-all duration-300 ease-in-out flex flex-col w-72 md:w-64 shadow-xl md:shadow-none
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-20 lg:w-64'}
        `}
      >
        <div className="h-16 flex items-center px-6 border-b border-gray-100 dark:border-gray-700 justify-between">
           <div className="flex items-center gap-3 overflow-hidden">
             <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white flex-shrink-0 shadow-sm">
               <Command size={18} />
             </div>
             <span className={`font-bold text-gray-800 dark:text-white text-lg whitespace-nowrap transition-opacity duration-300 ${!isMobile && !isSidebarOpen ? 'md:hidden lg:block' : ''}`}>
               Планировщик
             </span>
           </div>
           {isMobile && (
             <button onClick={() => setSidebarOpen(false)} className="text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded-md">
               <X size={24} />
             </button>
           )}
        </div>

        {/* User Profile Snippet in Sidebar */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <div className={`flex items-center gap-3 ${!isMobile && !isSidebarOpen ? 'justify-center lg:justify-start' : ''}`}>
                <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900 border border-indigo-200 dark:border-indigo-700 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm flex-shrink-0">
                    {user?.avatar ? <img src={user.avatar} className="w-full h-full rounded-full object-cover"/> : getInitials(user?.name || '')}
                </div>
                <div className={`min-w-0 transition-opacity duration-200 ${!isMobile && !isSidebarOpen ? 'hidden lg:block' : 'block'}`}>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{user?.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                </div>
            </div>
        </div>

        <nav className="p-4 space-y-2 flex-1 overflow-y-auto scrollbar-hide">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors whitespace-nowrap group relative
                ${currentView === item.id 
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium' 
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                }`}
            >
              <item.icon size={22} strokeWidth={currentView === item.id ? 2.5 : 2} className="flex-shrink-0" />
              <span className={`transition-opacity duration-200 ${!isMobile && !isSidebarOpen ? 'md:hidden lg:block' : ''}`}>
                {item.label}
              </span>
              
              {!isMobile && !isSidebarOpen && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none md:hidden lg:hidden z-50 whitespace-nowrap">
                  {item.label}
                </div>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
             <button 
                onClick={() => handleNavClick('SETTINGS')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors whitespace-nowrap rounded-lg ${currentView === 'SETTINGS' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : ''}`}
             >
                <Settings size={22} className="flex-shrink-0" />
                <span className={`${!isMobile && !isSidebarOpen ? 'md:hidden lg:block' : ''}`}>Настройки</span>
             </button>
             
             <button 
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-3 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors whitespace-nowrap"
             >
                <LogOut size={22} className="flex-shrink-0" />
                <span className={`${!isMobile && !isSidebarOpen ? 'md:hidden lg:block' : ''}`}>Выйти</span>
             </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden w-full relative bg-gray-50 dark:bg-gray-900 transition-colors">
        
        <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 lg:px-6 flex-shrink-0 shadow-sm z-30 transition-colors">
             <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSidebarOpen(!isSidebarOpen)} 
                  className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 focus:outline-none md:hidden"
                >
                    <Menu size={24} />
                </button>
                <h1 className="text-lg font-bold text-gray-800 dark:text-white truncate max-w-[150px] sm:max-w-none">
                    {currentView === 'SETTINGS' ? 'Настройки' : navItems.find(i => i.id === currentView)?.label}
                </h1>
             </div>
             
             <div className="flex items-center gap-2 sm:gap-4">
                 <button 
                    onClick={onCreateTask}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg transition-colors shadow-sm active:scale-95"
                 >
                     <Plus size={18} />
                     <span className="hidden sm:inline font-medium">Создать</span>
                 </button>
                 
                 <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block"></div>
                 
                 <NotificationCenter 
                    notifications={notifications}
                    onMarkRead={onMarkNotificationRead}
                    onMarkAllRead={onMarkAllNotificationsRead}
                    unreadCount={unreadCount}
                 />

                 <div className="hidden sm:flex items-center gap-2">
                     <span className="text-sm text-gray-500 dark:text-gray-400">Команда:</span>
                     <select className="text-sm font-medium bg-gray-50 dark:bg-gray-700 dark:text-white border-transparent focus:border-indigo-500 focus:ring-0 rounded-md py-1 px-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600">
                         <option>Acme Corp</option>
                     </select>
                 </div>
             </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto p-3 md:p-6 w-full relative">
            <div className="max-w-7xl mx-auto h-full flex flex-col">
              {children}
            </div>
        </main>
      </div>
    </div>
  );
};