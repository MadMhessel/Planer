import { motion } from 'framer-motion';
import { AlertTriangle, Download } from 'lucide-react';
import { KPICard } from '../components/analytics/KPICard';
import { LineChart } from '../components/analytics/LineChart';
import { PieChart } from '../components/analytics/PieChart';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAnalytics } from '../hooks/useAnalytics';

export const Analytics = () => {
  const { kpis, lineData, pieData, flaggedConversations } = useAnalytics();
  const проблемныеДиалоги = flaggedConversations.slice(0, 3);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Button variant="outline" className="w-full justify-start sm:w-auto sm:justify-center">
            1 мая - 31 мая 2025
          </Button>
          <Button variant="outline" className="w-full justify-start sm:w-auto sm:justify-center">
            Все ассистенты
          </Button>
          <Button variant="outline" className="w-full justify-start sm:w-auto sm:justify-center">
            Все каналы подключения
          </Button>
        </div>
        <Button variant="outline" className="w-full sm:w-auto">
          <Download className="h-4 w-4" />
          Экспорт
        </Button>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => (
          <KPICard key={item.id} item={item} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr_1fr]">
        <LineChart data={lineData} />
        <PieChart data={pieData} />

        <Card title="Проблемные диалоги" description="Взаимодействия с низкой уверенностью" animate>
          <div className="space-y-2">
            {проблемныеДиалоги.map((item) => (
              <div key={item.id} className="rounded-md border border-slate-200 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                  <span className="text-xs text-slate-500">{item.time}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">Уверенность: {item.confidence}%</p>
                <div className="mt-2 flex items-center justify-between">
                  <div className="h-1.5 w-28 rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-rose-400" style={{ width: `${item.confidence}%` }} />
                  </div>
                  <Badge variant="danger">Низкая уверенность</Badge>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-slate-600 transition-colors hover:text-accent-violet"
          >
            <AlertTriangle className="h-4 w-4" />
            Открыть все проблемные диалоги ({flaggedConversations.length})
          </button>
        </Card>
      </div>
    </div>
  );
};
