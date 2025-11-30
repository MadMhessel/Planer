import React, { useState, useMemo } from "react";
import { Sparkles, Send, X } from "lucide-react";

interface AICommandBarProps {
  onCommand: (command: string) => Promise<void>;
  isProcessing: boolean;
}

// Определяем, что это тач-устройство (делаем безопасно для SSR)
const isTouchEnvironment =
  typeof window !== "undefined" &&
  (("ontouchstart" in window) ||
    (navigator as any).maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0);

export const AICommandBar: React.FC<AICommandBarProps> = ({
  onCommand,
  isProcessing,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");

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
    await onCommand(input.trim());
    setInput("");
  };

  // ===== МОБИЛЬНАЯ ВЕРСИЯ: компактная панель внизу, без перекрытия модалок =====
  if (isTouchEnvironment) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-30 sm:hidden animate-slide-up">
        <div className="mx-2 mb-2 rounded-2xl border border-slate-700/50 bg-slate-900/95 backdrop-blur-xl px-4 py-3 shadow-2xl">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-50 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  AI-помощник
                </span>
                <span className="text-[11px] text-slate-400">
                  Кратко напишите, что нужно сделать
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <textarea
              className="flex-1 resize-none rounded-xl border border-slate-700/50 bg-slate-800/60 px-3 py-2.5 text-xs text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 max-h-24 transition-all"
              rows={2}
              disabled={isProcessing}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Например: «Разбери этот проект на задачи для команды…»"
            />
            <button
              type="submit"
              disabled={isProcessing || !input.trim()}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-xl hover:shadow-indigo-500/40 hover:scale-110 transition-all"
              title="Отправить в AI"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => setInput(prompt)}
                className="rounded-full border border-slate-700/50 bg-slate-800/60 px-2.5 py-1 text-[10px] text-slate-200 hover:bg-slate-700/80 hover:border-slate-600 transition-all font-medium"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ===== ДЕСКТОП: плавающая кнопка + аккуратная нижняя панель =====
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

      {/* Панель — нижнее окошко */}
      {isOpen && (
        <div className="fixed inset-0 z-40 flex items-end justify-center pointer-events-none animate-fade-in">
          <div className="w-full max-w-2xl mx-4 mb-6 pointer-events-auto rounded-2xl border border-slate-700/50 bg-slate-900/95 backdrop-blur-xl shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-800/50 bg-gradient-to-r from-slate-800/50 to-slate-900/50 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-50 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                    AI-помощник
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Напишите, как изменить задачи, сроки или участников
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-700/50 text-slate-400 hover:bg-slate-800/80 hover:text-slate-100 hover:border-slate-600 transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-5 pt-3 pb-4">
              <textarea
                className="w-full min-h-[80px] max-h-40 resize-none rounded-xl border border-slate-700/50 bg-slate-800/60 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                disabled={isProcessing}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Например: «Разбери этот проект на задачи для команды, расставь приоритеты и предложи дедлайны…»"
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1.5">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => setInput(prompt)}
                      className="rounded-full border border-slate-700/50 bg-slate-800/60 px-3 py-1 text-[11px] text-slate-200 hover:bg-slate-700/80 hover:border-slate-600 transition-all font-medium"
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
      )}
    </>
  );
};
