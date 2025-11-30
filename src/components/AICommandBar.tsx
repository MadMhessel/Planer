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
      <div className="fixed inset-x-0 bottom-0 z-30 sm:hidden">
        <div className="mx-2 mb-2 rounded-2xl border border-slate-700 bg-slate-900/95 backdrop-blur px-3 py-2 shadow-2xl">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500/90">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-50">
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
              className="flex-1 resize-none rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-2 text-xs text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 max-h-24"
              rows={2}
              disabled={isProcessing}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Например: «Разбери этот проект на задачи для команды…»"
            />
            <button
              type="submit"
              disabled={isProcessing || !input.trim()}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500 text-white shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
              title="Отправить в AI"
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
                className="rounded-full border border-slate-700 bg-slate-800/80 px-2 py-1 text-[10px] text-slate-200 hover:bg-slate-700 transition-colors"
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
      {/* Плавающая кнопка — только на десктопе, и с меньшим z-index */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="hidden md:flex fixed bottom-6 right-6 z-30 items-center gap-2 rounded-full bg-indigo-500 text-white px-4 py-2 shadow-lg hover:bg-indigo-600 transition-colors"
        >
          <Sparkles className="h-4 w-4" />
          <span className="text-sm font-medium">AI-помощник</span>
        </button>
      )}

      {/* Панель — нижнее окошко, а не полноэкранный блок, z-40 чтобы модалки были выше */}
      {isOpen && (
        <div className="fixed inset-0 z-40 flex items-end justify-center pointer-events-none">
          <div className="w-full max-w-2xl mx-4 mb-6 pointer-events-auto rounded-2xl border border-slate-700 bg-slate-900/95 shadow-2xl">
            <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500/90">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-50">
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
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-4 pt-2 pb-3">
              <textarea
                className="w-full min-h-[72px] max-h-40 resize-none rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                disabled={isProcessing}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Например: «Разбери этот проект на задачи для команды, расставь приоритеты и предложи дедлайны…»"
              />
              <div className="mt-2 flex items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1.5">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => setInput(prompt)}
                      className="rounded-full border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[11px] text-slate-200 hover:bg-slate-700 transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={isProcessing || !input.trim()}
                  className="inline-flex items-center gap-2 rounded-full bg-indigo-500 px-4 py-1.5 text-xs font-medium text-white shadow disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-600 transition-colors"
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
