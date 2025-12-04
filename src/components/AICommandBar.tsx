import React, { useState, useMemo, useRef, useEffect } from "react";
import { Sparkles, Send, X, ChevronUp, ChevronDown, FileText, Calendar, CheckSquare, Lightbulb, Zap, HelpCircle } from "lucide-react";
import { formatMoscowDate } from '../utils/dateUtils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestedTasks?: Array<{
    title: string;
    description?: string;
    priority?: string;
    dueDate?: string;
  }>;
}

interface AICommandBarProps {
  onCommand: (command: string) => Promise<string | null>; // Теперь возвращает ответ AI
  isProcessing: boolean;
  chatHistory?: Array<{ role: 'user' | 'assistant'; content: string }>; // История из App
}

// Тип для Navigator с touch событиями
interface NavigatorWithTouch extends Navigator {
  maxTouchPoints?: number;
  msMaxTouchPoints?: number;
}

// Определяем, что это тач-устройство (делаем безопасно для SSR)
const isTouchEnvironment =
  typeof window !== "undefined" &&
  (("ontouchstart" in window) ||
    ((navigator as NavigatorWithTouch).maxTouchPoints ?? 0) > 0 ||
    ((navigator as NavigatorWithTouch).msMaxTouchPoints ?? 0) > 0);

// Пресеты с понятными сценариями
const PRESET_SCENARIOS = [
  {
    id: 'parse-text',
    title: 'Разобрать текст на задачи',
    description: 'Вставьте большой текст, и AI разобьёт его на отдельные задачи',
    icon: FileText,
    prompt: 'Разбери следующий текст и создай задачи:',
    example: 'Пример: "Нужно сделать: 1) Обновить дизайн главной страницы 2) Написать документацию 3) Провести тестирование"'
  },
  {
    id: 'plan-week',
    title: 'План на неделю',
    description: 'AI создаст структурированный план задач на неделю',
    icon: Calendar,
    prompt: 'Создай план задач на эту неделю для проекта',
    example: 'Пример: "Создай план разработки на неделю с задачами по фронтенду и бэкенду"'
  },
  {
    id: 'review-overdue',
    title: 'Проверить просроченные',
    description: 'Найти и проанализировать просроченные задачи',
    icon: CheckSquare,
    prompt: 'Проверь просроченные задачи и предложи план действий',
    example: 'Пример: "Найди все просроченные задачи и предложи, как их решить"'
  },
  {
    id: 'breakdown-task',
    title: 'Разбить задачу на подзадачи',
    description: 'Большую задачу можно разбить на более мелкие',
    icon: Zap,
    prompt: 'Разбей эту задачу на подзадачи:',
    example: 'Пример: "Разбей задачу \'Разработать мобильное приложение\' на подзадачи"'
  },
  {
    id: 'suggest-priorities',
    title: 'Предложить приоритеты',
    description: 'AI проанализирует задачи и предложит приоритеты',
    icon: Lightbulb,
    prompt: 'Проанализируй задачи и предложи приоритеты',
    example: 'Пример: "Посмотри все задачи и предложи, какие нужно сделать в первую очередь"'
  }
] as const;

export const AICommandBar: React.FC<AICommandBarProps> = ({
  onCommand,
  isProcessing,
  chatHistory = [],
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [showTooltip, setShowTooltip] = useState(false);
  const [hasSeenWelcome, setHasSeenWelcome] = useState(() => {
    // Проверяем, видел ли пользователь приветствие
    return localStorage.getItem('ai-welcome-seen') === 'true';
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Синхронизируем локальные сообщения с историей из App
  useEffect(() => {
    const historyMessages: Message[] = chatHistory.map((msg, idx) => ({
      id: `history-${idx}-${msg.content.substring(0, 20).replace(/\s/g, '')}`,
      role: msg.role,
      content: msg.content,
      timestamp: new Date()
    }));
    
    // Обновляем только если изменилось содержимое
    setLocalMessages(prev => {
      if (prev.length === historyMessages.length && 
          prev.every((p, i) => p.content === historyMessages[i]?.content && p.role === historyMessages[i]?.role)) {
        return prev;
      }
      return historyMessages;
    });
  }, [chatHistory]);

  // Автопрокрутка к последнему сообщению
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [localMessages]);

  // Показываем приветствие при первом открытии
  useEffect(() => {
    if (isOpen && !hasSeenWelcome && localMessages.length === 0) {
      // Не добавляем приветствие в сообщения, оно будет показано в UI
    }
  }, [isOpen, hasSeenWelcome, localMessages.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const commandText = input.trim();
    setInput("");

    // Помечаем, что пользователь видел приветствие
    if (!hasSeenWelcome) {
      setHasSeenWelcome(true);
      localStorage.setItem('ai-welcome-seen', 'true');
    }

    try {
      const response = await onCommand(commandText);
      
      if (!response) {
        const errorMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'Не удалось получить ответ от AI. Попробуйте еще раз.',
          timestamp: new Date()
        };
        setLocalMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Произошла ошибка при обработке запроса. Попробуйте еще раз.',
        timestamp: new Date()
      };
      setLocalMessages(prev => [...prev, errorMessage]);
    }
  };

  const handlePresetClick = (preset: typeof PRESET_SCENARIOS[number]) => {
    setInput(preset.prompt);
    // Помечаем, что пользователь видел приветствие
    if (!hasSeenWelcome) {
      setHasSeenWelcome(true);
      localStorage.setItem('ai-welcome-seen', 'true');
    }
  };

  const handleTooltipShow = () => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
    setShowTooltip(true);
  };

  const handleTooltipHide = () => {
    tooltipTimeoutRef.current = setTimeout(() => {
      setShowTooltip(false);
    }, 200);
  };

  // Компонент кнопки с tooltip
  const AIButton = ({ className, onClick, children }: { className: string; onClick: () => void; children: React.ReactNode }) => (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={handleTooltipShow}
        onMouseLeave={handleTooltipHide}
        onFocus={handleTooltipShow}
        onBlur={handleTooltipHide}
        className={className}
        aria-label="Открыть AI-помощник"
        aria-describedby="ai-tooltip"
      >
        {children}
      </button>
      {showTooltip && !isOpen && (
        <div
          id="ai-tooltip"
          role="tooltip"
          className="absolute bottom-full right-0 mb-2 w-72 p-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl z-50 animate-fade-in-down"
          onMouseEnter={handleTooltipShow}
          onMouseLeave={handleTooltipHide}
        >
          <div className="flex items-start gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-1">
                AI-помощник
              </h3>
              <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
                Помогает создавать задачи, планировать спринты, разбирать тексты и анализировать работу команды
              </p>
            </div>
          </div>
          <div className="pt-2 border-t border-gray-100 dark:border-slate-700">
            <p className="text-xs text-gray-500 dark:text-slate-500">
              <strong>Примеры:</strong> "Разбей текст на задачи", "Создай план на неделю", "Проверь просроченные задачи"
            </p>
          </div>
        </div>
      )}
    </div>
  );

  // ===== МОБИЛЬНАЯ ВЕРСИЯ: кнопка + чат =====
  if (isTouchEnvironment) {
    return (
      <>
        {/* Плавающая кнопка для открытия чата */}
        {!isOpen && (
          <AIButton
            className="fixed bottom-20 sm:bottom-24 right-4 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-3 sm:px-4 py-2.5 sm:py-3 shadow-xl shadow-indigo-500/40 hover:shadow-2xl hover:shadow-indigo-500/50 hover:scale-110 active:scale-95 transition-all font-semibold touch-manipulation"
            onClick={() => setIsOpen(true)}
          >
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-xs sm:text-sm hidden xs:inline">AI-помощь</span>
          </AIButton>
        )}

        {/* Чат панель */}
        {isOpen && (
          <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-slate-900">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-900 dark:text-slate-50 bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                    AI-помощник
                  </span>
                  <span className="text-xs text-gray-600 dark:text-slate-400">
                    Чат с искусственным интеллектом
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-slate-100 transition-all"
                aria-label="Закрыть AI-помощник"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Сообщения */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {/* Приветственное сообщение при первом открытии */}
              {localMessages.length === 0 && !hasSeenWelcome && (
                <div className="mb-6 p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex-shrink-0">
                      <HelpCircle className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-2">
                        Что умеет AI-помощник?
                      </h3>
                      <ul className="text-xs text-gray-700 dark:text-slate-300 space-y-1.5 mb-3">
                        <li className="flex items-start gap-2">
                          <span className="text-indigo-500 mt-0.5">•</span>
                          <span><strong>Создавать задачи</strong> из текста или команд</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-indigo-500 mt-0.5">•</span>
                          <span><strong>Разбивать</strong> большие задачи на подзадачи</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-indigo-500 mt-0.5">•</span>
                          <span><strong>Планировать</strong> спринты и недели</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-indigo-500 mt-0.5">•</span>
                          <span><strong>Анализировать</strong> просроченные задачи</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-indigo-500 mt-0.5">•</span>
                          <span><strong>Предлагать</strong> приоритеты и сроки</span>
                        </li>
                      </ul>
                      <p className="text-xs text-gray-600 dark:text-slate-400 italic">
                        Просто опишите, что нужно сделать, и AI поможет структурировать это в задачи
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Пресеты при пустом чате */}
              {localMessages.length === 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700 dark:text-slate-300 text-center mb-3">
                    Попробуйте один из сценариев:
                  </p>
                  {PRESET_SCENARIOS.map((preset) => {
                    const Icon = preset.icon;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handlePresetClick(preset)}
                        className="w-full text-left p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all group"
                      >
                        <div className="flex items-start gap-3">
                          <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex-shrink-0 group-hover:scale-110 transition-transform">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-1">
                              {preset.title}
                            </h4>
                            <p className="text-xs text-gray-600 dark:text-slate-400 mb-2">
                              {preset.description}
                            </p>
                            <p className="text-[10px] text-gray-500 dark:text-slate-500 italic">
                              {preset.example}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Сообщения чата */}
              {localMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                        : 'bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-slate-100 border border-gray-200 dark:border-slate-700'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.role === 'user' ? 'text-indigo-100' : 'text-gray-500 dark:text-slate-400'
                    }`}>
                      {formatMoscowDate(message.timestamp, { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}

              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl px-4 py-2.5 border border-gray-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Форма ввода */}
            <div className="border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
              <form onSubmit={handleSubmit} className="flex items-end gap-2">
                <textarea
                  className="flex-1 resize-none rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-gray-900 dark:text-slate-50 placeholder:text-gray-500 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 max-h-24 transition-all"
                  rows={2}
                  disabled={isProcessing}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Напишите команду или опишите задачу..."
                />
                <button
                  type="submit"
                  disabled={isProcessing || !input.trim()}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-xl hover:shadow-indigo-500/40 hover:scale-110 transition-all"
                  title="Отправить"
                  aria-label="Отправить сообщение"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>

              {/* Быстрые пресеты под полем ввода */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {PRESET_SCENARIOS.slice(0, 3).map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handlePresetClick(preset)}
                    className="rounded-full border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-2.5 py-1 text-[10px] text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all"
                  >
                    {preset.title}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // ===== ДЕСКТОП: плавающая кнопка + чат панель =====
  return (
    <>
      {/* Плавающая кнопка — только на десктопе */}
      {!isOpen && (
        <AIButton
          className="hidden md:flex fixed bottom-6 right-6 z-30 items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-5 py-3 shadow-xl shadow-indigo-500/40 hover:shadow-2xl hover:shadow-indigo-500/50 hover:scale-110 transition-all font-semibold"
          onClick={() => setIsOpen(true)}
        >
          <Sparkles className="h-4 w-4" />
          <span className="text-sm">AI-помощник</span>
        </AIButton>
      )}

      {/* Чат панель — нижнее окошко */}
      {isOpen && (
        <div className="fixed inset-0 z-40 flex items-end justify-center pointer-events-none animate-fade-in">
          <div className="w-full max-w-2xl mx-4 mb-6 h-[600px] pointer-events-auto rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl animate-slide-up flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-200 dark:border-slate-800 bg-gradient-to-r from-gray-50 to-white dark:from-slate-800/50 dark:to-slate-900/50 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-gray-900 dark:text-slate-50 bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                    AI-помощник
                  </span>
                  <span className="text-[11px] text-gray-600 dark:text-slate-400">
                    Чат с искусственным интеллектом
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-slate-100 transition-all"
                aria-label="Закрыть AI-помощник"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Сообщения */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Приветственное сообщение при первом открытии */}
              {localMessages.length === 0 && !hasSeenWelcome && (
                <div className="mb-6 p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex-shrink-0">
                      <HelpCircle className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-2">
                        Что умеет AI-помощник?
                      </h3>
                      <ul className="text-xs text-gray-700 dark:text-slate-300 space-y-1.5 mb-3">
                        <li className="flex items-start gap-2">
                          <span className="text-indigo-500 mt-0.5">•</span>
                          <span><strong>Создавать задачи</strong> из текста или команд</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-indigo-500 mt-0.5">•</span>
                          <span><strong>Разбивать</strong> большие задачи на подзадачи</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-indigo-500 mt-0.5">•</span>
                          <span><strong>Планировать</strong> спринты и недели</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-indigo-500 mt-0.5">•</span>
                          <span><strong>Анализировать</strong> просроченные задачи</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-indigo-500 mt-0.5">•</span>
                          <span><strong>Предлагать</strong> приоритеты и сроки</span>
                        </li>
                      </ul>
                      <p className="text-xs text-gray-600 dark:text-slate-400 italic">
                        Просто опишите, что нужно сделать, и AI поможет структурировать это в задачи
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Пресеты при пустом чате */}
              {localMessages.length === 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700 dark:text-slate-300 text-center mb-3">
                    Попробуйте один из сценариев:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {PRESET_SCENARIOS.map((preset) => {
                      const Icon = preset.icon;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handlePresetClick(preset)}
                          className="text-left p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all group"
                        >
                          <div className="flex items-start gap-2 mb-2">
                            <div className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex-shrink-0 group-hover:scale-110 transition-transform">
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-semibold text-gray-900 dark:text-slate-100 mb-1">
                                {preset.title}
                              </h4>
                            </div>
                          </div>
                          <p className="text-[10px] text-gray-600 dark:text-slate-400">
                            {preset.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Сообщения чата */}
              {localMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                        : 'bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-slate-100 border border-gray-200 dark:border-slate-700'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.role === 'user' ? 'text-indigo-100' : 'text-gray-500 dark:text-slate-400'
                    }`}>
                      {formatMoscowDate(message.timestamp, { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}

              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl px-4 py-2.5 border border-gray-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Форма ввода */}
            <div className="border-t border-gray-200 dark:border-slate-800 px-5 pt-3 pb-4">
              <form onSubmit={handleSubmit}>
                <textarea
                  className="w-full min-h-[80px] max-h-40 resize-none rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm text-gray-900 dark:text-slate-50 placeholder:text-gray-500 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                  disabled={isProcessing}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Напишите команду или опишите задачу..."
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_SCENARIOS.slice(0, 4).map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handlePresetClick(preset)}
                        className="rounded-full border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-3 py-1 text-[11px] text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all"
                      >
                        {preset.title}
                      </button>
                    ))}
                  </div>
                  <button
                    type="submit"
                    disabled={isProcessing || !input.trim()}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-500/30 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-xl hover:shadow-indigo-500/40 hover:scale-105 transition-all"
                  >
                    <span>Отправить</span>
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
