import clsx from 'clsx';
import {
  BarChart3,
  ChevronDown,
  Database,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Plug,
  Rocket,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAssistant } from '../../hooks/useAssistant';
import { useUIStore } from '../../store/uiStore';
import { выйтиИзАккаунта } from '../../utils/auth';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';

const navItems = [
  { to: '/dashboard', label: 'Конструктор', icon: LayoutDashboard },
  { to: '/knowledge', label: 'База знаний', icon: Database },
  { to: '/integrations', label: 'Интеграции', icon: Plug },
  { to: '/analytics', label: 'Аналитика', icon: BarChart3 },
  { to: '/deploy', label: 'Деплой', icon: Rocket },
];

const ОбщаяНавигация = ({ compact = false, onNavigate }: { compact?: boolean; onNavigate?: () => void }) => {
  return (
    <nav className={clsx('space-y-1', compact && 'w-full')} aria-label="Навигация конструктора">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            title={compact ? item.label : undefined}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/35',
                isActive ? 'bg-violet-50 text-accent-violet' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                compact && 'justify-center px-0',
              )
            }
          >
            <Icon className="h-5 w-5" />
            {compact ? <span className="sr-only">{item.label}</span> : item.label}
          </NavLink>
        );
      })}
    </nav>
  );
};

export const Sidebar = () => {
  const navigate = useNavigate();
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen);

  const { assistants, selectedAssistantId, setSelectedAssistant } = useAssistant();
  const [ассистентыОткрыты, setАссистентыОткрыты] = useState(true);

  useEffect(() => {
    const обработчикEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setАссистентыОткрыты(false);
      }
    };

    window.addEventListener('keydown', обработчикEscape);
    return () => window.removeEventListener('keydown', обработчикEscape);
  }, []);

  const завершитьСессию = async () => {
    await выйтиИзАккаунта();
    setSidebarOpen(false);
    navigate('/', { replace: true });
  };

  const closeMobile = () => setSidebarOpen(false);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-16 border-r border-slate-200 bg-white sm:flex lg:hidden" aria-label="Боковая панель">
        <div className="flex h-full w-full flex-col items-center py-4">
          <Link
            to="/dashboard"
            className="mb-5 inline-flex h-10 w-10 items-center justify-center"
            aria-label="Открыть конструктор"
            title="Конструктор"
          >
            <img src="/assets/logo-mark-clean.png" alt="" className="h-9 w-9 object-contain" loading="lazy" />
          </Link>

          <div className="flex w-full flex-1 flex-col items-center px-2">
            <ОбщаяНавигация compact />
          </div>

          <button
            type="button"
            onClick={завершитьСессию}
            className="mt-3 rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/35"
            aria-label="Выйти"
            title="Выйти"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </aside>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-slate-200 bg-white lg:flex" aria-label="Боковая панель">
        <div className="flex h-full w-full flex-col">
          <div className="flex items-center border-b border-slate-200 px-4 py-4">
            <Link to="/dashboard" className="inline-flex items-center" aria-label="Перейти в конструктор">
              <img src="/assets/logo-full-clean.png" alt="ИИ Ассистенты" className="h-10 w-auto object-contain" loading="lazy" />
            </Link>
          </div>

          <div className="space-y-5 overflow-y-auto px-3 py-4">
            <ОбщаяНавигация />

            <section className="space-y-2" aria-label="Список ассистентов">
              <button
                type="button"
                onClick={() => setАссистентыОткрыты((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/35"
                aria-expanded={ассистентыОткрыты}
              >
                <span className="inline-flex items-center gap-2">
                  <Menu className="h-4 w-4 text-slate-500" />
                  Ассистенты
                </span>
                <ChevronDown className={clsx('h-4 w-4 text-slate-400 transition-transform', ассистентыОткрыты && 'rotate-180')} />
              </button>

              {ассистентыОткрыты ? (
                <div className="space-y-2 px-1">
                  {assistants.map((assistant) => (
                    <button
                      key={assistant.id}
                      type="button"
                      onClick={() => setSelectedAssistant(assistant.id)}
                      className={clsx(
                        'w-full rounded-card border p-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/35',
                        selectedAssistantId === assistant.id
                          ? 'border-accent-violet/40 bg-violet-50/70'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar name={assistant.name} size="sm" status={assistant.status} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">{assistant.name}</p>
                          <p className="truncate text-xs text-slate-500">{assistant.role}</p>
                        </div>
                      </div>
                    </button>
                  ))}

                  <button
                    type="button"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-violet-300 bg-violet-50/50 px-3 py-2 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/35"
                  >
                    <Plus className="h-4 w-4" />
                    Создать нового
                  </button>
                </div>
              ) : null}
            </section>
          </div>

          <div className="border-t border-slate-200 p-3">
            <div className="mb-3 rounded-card border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Хранилище</p>
              <p className="mt-1 text-sm font-medium text-slate-800">247 / 500 МБ</p>
              <div className="mt-2 h-1.5 rounded-full bg-slate-200">
                <div className="h-full w-1/2 rounded-full bg-accent-violet" />
              </div>
            </div>

            <Button fullWidth variant="outline" onClick={завершитьСессию} aria-label="Выйти из аккаунта">
              <LogOut className="h-4 w-4" />
              Выйти
            </Button>
          </div>
        </div>
      </aside>

      <aside
        className={clsx(
          'fixed inset-y-0 right-0 z-40 w-72 border-l border-slate-200 bg-white transition-transform duration-300 sm:hidden',
          sidebarOpen ? 'translate-x-0' : 'translate-x-full',
        )}
        aria-label="Мобильная боковая панель"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
            <Link to="/dashboard" className="inline-flex items-center" onClick={closeMobile} aria-label="Перейти в конструктор">
              <img src="/assets/logo-full-clean.png" alt="ИИ Ассистенты" className="h-9 w-auto object-contain" loading="lazy" />
            </Link>

            <button
              type="button"
              onClick={closeMobile}
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/35"
              aria-label="Закрыть боковую панель"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-5 overflow-y-auto px-4 py-4">
            <ОбщаяНавигация onNavigate={closeMobile} />
          </div>

          <div className="mt-auto border-t border-slate-200 p-4">
            <Button fullWidth variant="outline" onClick={завершитьСессию} aria-label="Выйти из аккаунта">
              <LogOut className="h-4 w-4" />
              Выйти
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
};
