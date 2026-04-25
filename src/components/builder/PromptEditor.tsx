import { Sparkles, Wand2 } from 'lucide-react';
import { useId, useMemo } from 'react';
import { useAssistant } from '../../hooks/useAssistant';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';

export const PromptEditor = () => {
  const { systemPrompt, setSystemPrompt, selectedAssistant } = useAssistant();
  const textareaId = useId();

  const tokenCount = useMemo(() => {
    const words = systemPrompt.trim().split(/\s+/).filter(Boolean);
    return words.length;
  }, [systemPrompt]);

  return (
    <Card
      title="Системный промпт"
      description="Опишите поведение, роль и стиль ответов ассистента."
      actions={
        <Button variant="outline" size="sm">
          Библиотека шаблонов
        </Button>
      }
      animate
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Input label="Имя ассистента" placeholder="Имя ассистента" defaultValue={selectedAssistant?.name} />
        <Input label="Описание" placeholder="Описание" defaultValue={selectedAssistant?.role} />
      </div>

      <div className="space-y-2">
        <label htmlFor={textareaId} className="text-sm font-medium text-slate-700">
          Системный промпт
        </label>
        <textarea
          id={textareaId}
          value={systemPrompt}
          onChange={(event) => setSystemPrompt(event.target.value)}
          placeholder="Ты — профессиональный юридический консультант..."
          className="h-64 w-full resize-none rounded-card border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700 transition-colors focus:border-accent-violet focus:outline-none focus:ring-2 focus:ring-accent-violet/25"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
          <Sparkles className="h-3.5 w-3.5 text-accent-teal" />
          {tokenCount} токенов
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            Форматировать
          </Button>
          <Button variant="secondary" size="sm">
            <Wand2 className="h-4 w-4" />
            Улучшить промпт
          </Button>
        </div>
      </div>
    </Card>
  );
};
