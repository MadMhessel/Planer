import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bot,
  ChevronDown,
  Database,
  Globe,
  Infinity as InfinityIcon,
  LifeBuoy,
  Lock,
  MessageCircle,
  MessagesSquare,
  Palette,
  Plug,
  Timer,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

const логотипы = ['ФинПоток', 'ЮрЛайн', 'РитейлПлюс', 'ТехГрад', 'МедПлатформа', 'Сервис24'];

const возможности = [
  { заголовок: 'Персонализация', описание: 'Настройка личности, тона и поведения под ваш бренд.', иконка: Palette },
  { заголовок: 'База знаний', описание: 'Загрузка документов и быстрый поиск по контексту.', иконка: Database },
  { заголовок: 'Интеграции', описание: 'Подключение каналов и внутренних сервисов.', иконка: Plug },
  { заголовок: 'Аналитика', описание: 'Метрики по диалогам, качеству и эффективности.', иконка: BarChart3 },
  { заголовок: 'Белый лейбл', описание: 'Ваш домен, ваш бренд, ваш пользовательский опыт.', иконка: Globe },
  { заголовок: 'Безлимит', описание: 'Масштабирование ассистентов под рост команды.', иконка: InfinityIcon },
  { заголовок: 'Безопасность', описание: 'Шифрование данных и контроль доступов.', иконка: Lock },
  { заголовок: 'Поддержка', описание: 'Помощь в запуске и развитии сценариев.', иконка: LifeBuoy },
];

const тарифы = [
  {
    план: 'Старт',
    цена: '4 990 ₽/мес',
    пункты: ['1 ассистент', '50 МБ', 'Телеграм'],
    выделить: false,
  },
  {
    план: 'Рост',
    цена: '14 990 ₽/мес',
    пункты: ['3 ассистента', '500 МБ', 'Все интеграции'],
    выделить: true,
  },
  {
    план: 'Бизнес',
    цена: '44 990 ₽/мес',
    пункты: ['Безлимит', 'Собственный бренд', 'Гарантия уровня сервиса'],
    выделить: false,
  },
];

const кейсы = [
  {
    метрика: '3x быстрее',
    заголовок: 'Сокращение времени ответа',
    текст: 'Команда поддержки ускорила обработку обращений в три раза за первый месяц.',
  },
  {
    метрика: '−45%',
    заголовок: 'Меньше ручной работы',
    текст: 'Ассистент взял на себя рутинные ответы и освободил время команды.',
  },
  {
    метрика: '+62%',
    заголовок: 'Рост удовлетворённости',
    текст: 'Пользователи стали чаще получать точные ответы с первого запроса.',
  },
];

const faq = [
  {
    вопрос: 'Сколько времени занимает запуск?',
    ответ: 'Базовый ассистент можно собрать и запустить за 1 день, включая загрузку базы знаний и тестирование.',
  },
  {
    вопрос: 'Нужна ли команда разработки?',
    ответ: 'Нет. Платформа рассчитана на продуктовые и операционные команды без обязательного участия разработчиков.',
  },
  {
    вопрос: 'Какие каналы можно подключить?',
    ответ: 'Телеграм, Ватсап, веб-виджет, АПИ и другие интеграции из каталога платформы.',
  },
  {
    вопрос: 'Можно ли использовать собственный домен?',
    ответ: 'Да, в тарифах «Рост» и «Бизнес» доступно подключение пользовательского домена и брендирование.',
  },
  {
    вопрос: 'Как защищены данные?',
    ответ: 'Используются шифрование трафика, контроль ролей и журналирование действий в системе.',
  },
  {
    вопрос: 'Есть ли пробный период?',
    ответ: 'Да, после регистрации доступен бесплатный период для проверки сценариев и интеграций.',
  },
];

export const Landing = () => {
  const [открытыйFaq, setОткрытыйFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src="/assets/logo-mark-clean.png" alt="" className="h-9 w-9 object-contain sm:hidden" loading="lazy" />
            <img src="/assets/logo-full-clean.png" alt="ИИ Ассистенты" className="hidden h-10 w-auto object-contain sm:block" loading="lazy" />
          </Link>

          <div className="hidden items-center gap-6 text-sm text-slate-600 md:flex">
            <a href="#возможности" className="hover:text-slate-900">
              О продукте
            </a>
            <a href="#тарифы" className="hover:text-slate-900">
              Тарифы
            </a>
            <a href="#faq" className="hover:text-slate-900">
              Документация
            </a>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden sm:block">
              <Button variant="ghost">Войти</Button>
            </Link>
            <Link to="/register">
              <Button>Начать бесплатно</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto w-full max-w-7xl px-4 pb-12 pt-10 sm:px-6 sm:pt-14">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_1fr] lg:items-center">
            <div className="space-y-5 text-center lg:text-left">
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                <BadgeCheck className="h-3.5 w-3.5" />
                Платформа ИИ-ассистентов
              </span>
              <h1 className="text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
                Создайте ИИ-ассистента с характером
              </h1>
              <p className="mx-auto max-w-xl text-center text-base leading-7 text-slate-600 sm:text-lg">
                Персонализированный ИИ-сотрудник для вашего бизнеса. Знает вашу базу знаний, говорит на вашем языке,
                работает 24/7.
              </p>
              <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center lg:justify-start">
                <Link to="/register">
                  <Button size="lg">Начать бесплатно</Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline">
                    Войти
                  </Button>
                </Link>
              </div>
            </div>

            <Card className="p-0">
              <div className="rounded-card border border-slate-200 bg-gradient-to-br from-violet-50 via-white to-cyan-50 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">Предпросмотр конструктора</p>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Онлайн</span>
                </div>
                <div className="space-y-3 rounded-card border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800">ЮристАссистент</p>
                    <span className="text-xs text-slate-500">Сохранено 2 мин назад</span>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                    Ты — профессиональный юридический консультант...
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-md border border-slate-200 p-2.5 text-xs text-slate-600">Формальность: 70%</div>
                    <div className="rounded-md border border-slate-200 p-2.5 text-xs text-slate-600">Уровень экспертизы: 80%</div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-slate-50/70">
          <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
            <p className="text-center text-sm font-semibold text-slate-600">500+ компаний уже используют</p>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {логотипы.map((логотип) => (
                <div
                  key={логотип}
                  className="flex h-14 items-center justify-center rounded-card border border-slate-200 bg-white text-sm font-semibold text-slate-500"
                >
                  {логотип}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Проблема" description="Команды перегружены рутиной и ожиданием." className="h-full">
              <ul className="space-y-3 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <Timer className="mt-0.5 h-4 w-4 text-rose-500" />
                  Долгое время ответа клиентам.
                </li>
                <li className="flex items-start gap-2">
                  <MessagesSquare className="mt-0.5 h-4 w-4 text-rose-500" />
                  Повторяющиеся вопросы и ручная обработка.
                </li>
                <li className="flex items-start gap-2">
                  <Users className="mt-0.5 h-4 w-4 text-rose-500" />
                  Потеря контекста между сотрудниками.
                </li>
              </ul>
            </Card>

            <Card title="Решение" description="Единый ИИ-ассистент с вашей экспертизой." className="h-full">
              <ul className="space-y-3 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <Bot className="mt-0.5 h-4 w-4 text-accent-violet" />
                  Ассистент отвечает в вашем стиле и тоне.
                </li>
                <li className="flex items-start gap-2">
                  <Database className="mt-0.5 h-4 w-4 text-accent-violet" />
                  База знаний всегда под рукой.
                </li>
                <li className="flex items-start gap-2">
                  <MessageCircle className="mt-0.5 h-4 w-4 text-accent-violet" />
                  Работа 24/7 во всех каналах.
                </li>
              </ul>
            </Card>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 pb-14 sm:px-6">
          <h2 className="text-2xl font-semibold text-slate-900">Как это работает</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {[
              ['1', 'Создайте ассистента', 'Задайте роль, личность и системный промпт.'],
              ['2', 'Загрузите базу знаний', 'Добавьте документы и настройте чанки.'],
              ['3', 'Подключите к клиентам', 'Выберите каналы и опубликуйте.'],
            ].map(([номер, заголовок, описание]) => (
              <Card key={номер} className="h-full">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700">
                  {номер}
                </span>
                <p className="mt-3 text-base font-semibold text-slate-800">{заголовок}</p>
                <p className="mt-2 text-sm text-slate-600">{описание}</p>
              </Card>
            ))}
          </div>
        </section>

        <section id="возможности" className="mx-auto w-full max-w-7xl px-4 pb-14 sm:px-6">
          <h2 className="text-2xl font-semibold text-slate-900">Возможности платформы</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {возможности.map((пункт) => {
              const Icon = пункт.иконка;
              return (
                <Card key={пункт.заголовок} className="h-full">
                  <Icon className="h-5 w-5 text-accent-violet" />
                  <p className="mt-3 text-base font-semibold text-slate-800">{пункт.заголовок}</p>
                  <p className="mt-2 text-sm text-slate-600">{пункт.описание}</p>
                </Card>
              );
            })}
          </div>
        </section>

        <section id="тарифы" className="mx-auto w-full max-w-7xl px-4 pb-14 sm:px-6">
          <h2 className="text-2xl font-semibold text-slate-900">Тарифы</h2>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {тарифы.map((тариф) => (
              <Card
                key={тариф.план}
                className={тариф.выделить ? 'h-full border-violet-300 ring-2 ring-violet-200' : 'h-full'}
                title={тариф.план}
              >
                <p className="text-3xl font-semibold text-slate-900">{тариф.цена}</p>
                <ul className="mt-4 space-y-2 text-sm text-slate-700">
                  {тариф.пункты.map((пункт) => (
                    <li key={пункт} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent-teal" />
                      {пункт}
                    </li>
                  ))}
                </ul>
                <Link to="/register">
                  <Button fullWidth className="mt-5" variant={тариф.выделить ? 'primary' : 'outline'}>
                    Начать бесплатно
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 pb-14 sm:px-6">
          <h2 className="text-2xl font-semibold text-slate-900">Кейсы и отзывы</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {кейсы.map((кейс) => (
              <Card key={кейс.заголовок} className="h-full">
                <p className="text-3xl font-semibold text-accent-violet">{кейс.метрика}</p>
                <p className="mt-3 text-base font-semibold text-slate-800">{кейс.заголовок}</p>
                <p className="mt-2 text-sm text-slate-600">{кейс.текст}</p>
              </Card>
            ))}
          </div>
        </section>

        <section id="faq" className="mx-auto w-full max-w-5xl px-4 pb-14 sm:px-6">
          <h2 className="text-2xl font-semibold text-slate-900">Вопросы и ответы</h2>
          <div className="mt-5 space-y-2">
            {faq.map((пункт, индекс) => {
              const открыт = открытыйFaq === индекс;
              return (
                <div key={пункт.вопрос} className="rounded-card border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setОткрытыйFaq(открыт ? null : индекс)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                  >
                    <span className="text-sm font-semibold text-slate-800">{пункт.вопрос}</span>
                    <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${открыт ? 'rotate-180' : ''}`} />
                  </button>
                  {открыт ? <p className="px-4 pb-4 text-sm leading-6 text-slate-600">{пункт.ответ}</p> : null}
                </div>
              );
            })}
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 pb-14 sm:px-6">
          <Card className="border-violet-200 bg-gradient-to-r from-violet-50 via-white to-cyan-50 p-8 text-center">
            <h3 className="text-3xl font-semibold text-slate-900">Готовы создать своего ассистента?</h3>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-600">
              Запустите первого ассистента сегодня и подключите его к вашим каналам без сложной разработки.
            </p>
            <Link to="/register">
              <Button size="lg" className="mt-6 inline-flex items-center gap-2">
                Создать бесплатно
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </Card>
        </section>
      </main>

      <footer className="border-t border-slate-200">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-5">
            <a href="#возможности" className="hover:text-slate-900">
              О продукте
            </a>
            <a href="#тарифы" className="hover:text-slate-900">
              Тарифы
            </a>
            <a href="#faq" className="hover:text-slate-900">
              Документация
            </a>
          </div>
          <p>© 2026 ИИ Ассистенты</p>
        </div>
      </footer>
    </div>
  );
};
