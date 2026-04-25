import {
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { MetricPoint } from '../../types';
import { Card } from '../ui/Card';

interface LineChartProps {
  data: MetricPoint[];
}

export const LineChart = ({ data }: LineChartProps) => {
  return (
    <Card title="Объём сообщений по времени" description="Ежедневно" animate>
      <div className="overflow-x-auto pb-1">
        <div className="h-72 min-w-[560px] w-full sm:min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart data={data} margin={{ top: 12, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip
                cursor={{ stroke: '#8b5cf6', strokeDasharray: '4 4' }}
                contentStyle={{
                  borderRadius: 8,
                  borderColor: '#e2e8f0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              />
              <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </RechartsLineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs text-slate-500">Всего сообщений</p>
          <p className="text-lg font-semibold text-slate-900">8,943</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs text-slate-500">Среднее за день</p>
          <p className="text-lg font-semibold text-slate-900">288</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs text-slate-500">Пиковый день</p>
          <p className="text-lg font-semibold text-slate-900">912</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs text-slate-500">Минимальный день</p>
          <p className="text-lg font-semibold text-slate-900">154</p>
        </div>
      </div>
    </Card>
  );
};
