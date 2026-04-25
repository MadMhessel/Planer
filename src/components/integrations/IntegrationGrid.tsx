import { Plus } from 'lucide-react';
import type { Integration } from '../../types';
import { IntegrationCard } from './IntegrationCard';

interface IntegrationGridProps {
  integrations: Integration[];
}

export const IntegrationGrid = ({ integrations }: IntegrationGridProps) => {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {integrations.map((integration) => (
        <IntegrationCard key={integration.id} integration={integration} />
      ))}

      <button
        type="button"
        className="group flex min-h-56 flex-col items-center justify-center gap-3 rounded-card border border-dashed border-violet-300 bg-violet-50/30 p-4 text-center transition-all hover:-translate-y-0.5 hover:bg-violet-50"
      >
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-violet-300 text-violet-500">
          <Plus className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-800">Добавить интеграцию</p>
          <p className="text-xs text-slate-500">Вебхуки / АПИ</p>
        </div>
      </button>
    </div>
  );
};
