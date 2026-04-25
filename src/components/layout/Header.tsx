import { Bell, Menu, Save, Search } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';
import { useUIStore } from '../../store/uiStore';
import { получитьПользователя } from '../../utils/auth';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

const routeMeta: Record<string, { title: string; description: string; breadcrumb: string }> = {
  '/dashboard': {
    title: 'Конструктор ассистентов',
    description: 'Настройте поведение и сценарии ассистента.',
    breadcrumb: 'Конструктор / [Имя ассистента]',
  },
  '/knowledge': {
    title: 'База знаний',
    description: 'Загрузка и индексирование документов.',
    breadcrumb: 'База знаний / Индексация',
  },
  '/personality': {
    title: 'Личность ассистента',
    description: 'Тон, стиль и уровень экспертизы.',
    breadcrumb: 'Конструктор / Личность',
  },
  '/testing': {
    title: 'Тестирование',
    description: 'Проверка диалога и предпросмотр ответов.',
    breadcrumb: 'Конструктор / Тестирование',
  },
  '/integrations': {
    title: 'Интеграции',
    description: 'Подключение внешних сервисов и каналов.',
    breadcrumb: 'Интеграции / Каналы',
  },
  '/analytics': {
    title: 'Аналитика',
    description: 'Метрики эффективности ассистента.',
    breadcrumb: 'Аналитика / Статистика',
  },
  '/deploy': {
    title: 'Деплой',
    description: 'Подключение каналов и выпуск ассистента.',
    breadcrumb: 'Деплой / Каналы',
  },
};

export const Header = () => {
  const location = useLocation();
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const { успех } = useToast();

  const meta = routeMeta[location.pathname] ?? routeMeta['/dashboard'];
  const user = получитьПользователя();

  const сохранить = () => {
    успех('Изменения сохранены');
  };

  return (
    <header className="fixed inset-x-0 top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur sm:left-16 lg:left-60">
      <div className="flex min-h-20 items-start justify-between gap-3 px-4 py-3 sm:items-center sm:gap-4 sm:px-5 sm:py-0 lg:px-6">
        <div className="flex min-w-0 flex-1 items-start gap-2 sm:items-center sm:gap-3">
          <button
            type="button"
            onClick={toggleSidebar}
            className="rounded-md p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/35 sm:hidden"
            aria-label="Открыть боковую панель"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="hidden text-xs font-medium uppercase tracking-wide text-slate-500 sm:block">{meta.breadcrumb}</p>
            <h1 className="text-base font-semibold leading-5 text-slate-900 sm:text-lg">{meta.title}</h1>
            <p className="text-xs leading-4 text-slate-500 sm:text-sm">{meta.description}</p>
          </div>
        </div>

        <div className="hidden w-full max-w-xs lg:block">
          <Input placeholder="Поиск" prefix={<Search className="h-4 w-4" />} aria-label="Поиск по разделам" />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0" aria-label="Оповещения">
            <Bell className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={сохранить} aria-label="Сохранить изменения">
            <Save className="h-4 w-4" />
            Сохранить
          </Button>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-slate-800">{user?.имя || 'Денис Юркин'}</p>
            <p className="text-xs text-slate-500">Администратор</p>
          </div>
          <Avatar name={user?.имя || 'Денис Юркин'} size="sm" status="online" />
        </div>
      </div>
    </header>
  );
};
