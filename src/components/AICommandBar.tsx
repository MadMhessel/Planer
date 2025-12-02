import React, { useState, useMemo, useRef, useEffect } from "react";
import { Sparkles, Send, X, ChevronUp, ChevronDown } from "lucide-react";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
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

export const AICommandBar: React.FC<AICommandBarProps> = ({
  onCommand,
  isProcessing,
  chatHistory = [],
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
  }, [chatHistory]); // Обновляем при изменении истории

  // Автопрокрутка к последнему сообщению
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [localMessages]);

  const quickPrompts = useMemo(
    () => [
      "Сформулируй задачи из моего сообщения",
      "Разбей текущую большую задачу на подзадачи",
      "Проверь, ничего ли не упущено по срокам на этой неделе",
      "Предложи приоритеты задач на завтра",
    ],
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    // Не добавляем сообщение пользователя сразу - оно появится из chatHistory
    const commandText = input.trim();
    setInput("");

    try {
      const response = await onCommand(commandText);
      
      // Ответ тоже появится из chatHistory через useEffect
      // Но если ответ не пришел, показываем ошибку
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

  // ===== МОБИЛЬНАЯ ВЕРСИЯ: кнопка + чат =====
  if (isTouchEnvironment) {
    return (
      <>
        {/* Плавающая кнопка для открытия чата */}
        {!isOpen && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="fixed bottom-20 sm:bottom-24 right-4 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-3 sm:px-4 py-2.5 sm:py-3 shadow-xl shadow-indigo-500/40 hover:shadow-2xl hover:shadow-indigo-500/50 hover:scale-110 active:scale-95 transition-all font-semibold touch-manipulation"
            aria-label="Открыть AI-помощник"
          >
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-xs sm:text-sm hidden xs:inline">AI-помощь</span>
          </button>
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
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Сообщения */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {localMessages.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
                    Начните диалог с AI-помощником
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {quickPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => setInput(prompt)}
                        className="rounded-full border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-3 py-1.5 text-xs text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

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
                      {message.timestamp.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
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
                  placeholder="Напишите сообщение..."
                />
                <button
                  type="submit"
                  disabled={isProcessing || !input.trim()}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-xl hover:shadow-indigo-500/40 hover:scale-110 transition-all"
                  title="Отправить"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setInput(prompt)}
                    className="rounded-full border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-2.5 py-1 text-[10px] text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all"
                  >
                    {prompt}
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
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="hidden md:flex fixed bottom-6 right-6 z-30 items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-5 py-3 shadow-xl shadow-indigo-500/40 hover:shadow-2xl hover:shadow-indigo-500/50 hover:scale-110 transition-all font-semibold"
        >
          <Sparkles className="h-4 w-4" />
          <span className="text-sm">AI-помощник</span>
        </button>
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
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Сообщения */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {localMessages.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
                    Начните диалог с AI-помощником
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {quickPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => setInput(prompt)}
                        className="rounded-full border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-3 py-1.5 text-xs text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

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
                      {message.timestamp.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
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
                  placeholder="Напишите сообщение..."
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    {quickPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => setInput(prompt)}
                        className="rounded-full border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-3 py-1 text-[11px] text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all"
                      >
                        {prompt}
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
