import React, { useState } from 'react';
import { Sparkles, Send, X } from 'lucide-react';

interface AICommandBarProps {
  onCommand: (command: string) => Promise<void>;
  isProcessing: boolean;
}

export const AICommandBar: React.FC<AICommandBarProps> = ({ onCommand, isProcessing }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    await onCommand(input);
    setInput('');
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105 z-50 flex items-center gap-2"
      >
        <Sparkles size={24} />
        <span className="font-semibold pr-2 hidden md:inline">ИИ Ассистент</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setIsOpen(false)}>
      <div 
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl p-6 transform transition-all"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2 text-indigo-600">
             <Sparkles size={20} />
             <h3 className="font-bold text-lg">Командный центр ИИ</h3>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="relative">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Опишите, что нужно сделать... например, 'Создать задачу Проверить отчет к пятнице'"
            className="w-full h-32 p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-gray-700"
            autoFocus
          />
          <div className="mt-4 flex justify-between items-center">
             <div className="text-xs text-gray-400">
                Работает на Gemini 2.5 Flash
             </div>
             <button 
                type="submit" 
                disabled={isProcessing || !input.trim()}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-white transition-all
                    ${isProcessing || !input.trim() 
                        ? 'bg-gray-300 cursor-not-allowed' 
                        : 'bg-indigo-600 hover:bg-indigo-700 shadow-md'
                    }`}
             >
                {isProcessing ? (
                    <>Обработка...</>
                ) : (
                    <>Выполнить <Send size={16} /></>
                )}
             </button>
          </div>
        </form>
        
        <div className="mt-6 pt-6 border-t border-gray-100 hidden sm:block">
            <p className="text-sm font-medium text-gray-500 mb-2">Попробуйте сказать:</p>
            <div className="flex flex-wrap gap-2">
                <button onClick={() => setInput("Проверить бюджет к следующему понедельнику")} className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors">
                    "Проверить бюджет к пн"
                </button>
                <button onClick={() => setInput("Создать проект 'Зимний Маркетинг'")} className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors">
                    "Новый проект 'Маркетинг'"
                </button>
                 <button onClick={() => setInput("Разбей задачу 'Редизайн сайта' на 5 подзадач")} className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors">
                    "Разбей задачу на подзадачи"
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};