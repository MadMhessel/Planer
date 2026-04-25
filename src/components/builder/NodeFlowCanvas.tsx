import { ArrowRight, Bot, Database, PlayCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

export const NodeFlowCanvas = () => {
  return (
    <Card
      title="Схема узлов"
      description="Визуальный макет будущей логики оркестрации."
      actions={
        <Button variant="outline" size="sm">
          + Добавить узел
        </Button>
      }
      animate
    >
      <div className="relative h-72 overflow-hidden rounded-card border border-dashed border-slate-300 bg-slate-50">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,#e2e8f0_1px,transparent_0)] [background-size:16px_16px]" />

        <div className="absolute left-4 top-10 w-40 rounded-card border border-slate-200 bg-white p-3 shadow-soft">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Database className="h-4 w-4 text-accent-teal" />
            База знаний
          </div>
          <p className="text-xs text-slate-500">Исходные документы</p>
        </div>

        <div className="absolute left-52 top-32 w-44 rounded-card border border-violet-200 bg-violet-50 p-3 shadow-soft">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Bot className="h-4 w-4 text-accent-violet" />
            Ядро ассистента
          </div>
          <p className="text-xs text-slate-500">Системный промпт + личность</p>
        </div>

        <div className="absolute right-6 top-16 w-40 rounded-card border border-slate-200 bg-white p-3 shadow-soft">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <PlayCircle className="h-4 w-4 text-accent-teal" />
            Вывод
          </div>
          <p className="text-xs text-slate-500">Чат и маршрутизация каналов</p>
        </div>

        <ArrowRight className="absolute left-44 top-20 h-5 w-5 text-slate-400" />
        <ArrowRight className="absolute left-[23.5rem] top-[9.25rem] h-5 w-5 text-slate-400" />
      </div>
    </Card>
  );
};
