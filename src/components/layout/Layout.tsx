import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useUIStore } from '../../store/uiStore';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export const Layout = () => {
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen);

  useEffect(() => {
    if (!sidebarOpen) {
      return undefined;
    }

    const обработчикEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', обработчикEscape);
    return () => window.removeEventListener('keydown', обработчикEscape);
  }, [sidebarOpen, setSidebarOpen]);

  return (
    <div className="min-h-screen bg-app-bg text-slate-900">
      <Sidebar />

      {sidebarOpen ? (
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-20 bg-slate-900/25 sm:hidden"
          aria-label="Закрыть затемнение"
        />
      ) : null}

      <div className="sm:pl-16 lg:pl-60">
        <Header />
        <main className="px-4 pb-8 pt-24 sm:px-5 lg:px-6">
          <div className="mx-auto w-full max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
