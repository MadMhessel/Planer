import { MessageSquare, Send, Star, Timer } from 'lucide-react';
import type { KPI } from '../../types';
import { Card } from '../ui/Card';

interface KPICardProps {
  item: KPI;
}

const iconMap = {
  messages: MessageSquare,
  timer: Timer,
  send: Send,
  star: Star,
};

export const KPICard = ({ item }: KPICardProps) => {
  const Icon = iconMap[item.icon];

  return (
    <Card hoverable animate>
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-accent-violet">
          <Icon className="h-4.5 w-4.5" />
        </span>
        <svg viewBox="0 0 80 24" className="h-6 w-20 text-violet-300">
          <path d="M2 18 L12 14 L22 16 L32 9 L42 12 L52 8 L62 10 L72 4" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      </div>

      <p className="mt-3 text-sm text-slate-500">{item.label}</p>
      <p className="mt-1 text-3xl font-semibold text-slate-900">{item.value}</p>
      <p className={`mt-2 text-xs font-semibold ${item.trend === 'down' ? 'text-cyan-700' : 'text-emerald-600'}`}>
        {item.trend === 'down' ? '↓' : '↑'} {item.delta} к периоду 1 апр - 30 апр
      </p>
    </Card>
  );
};
