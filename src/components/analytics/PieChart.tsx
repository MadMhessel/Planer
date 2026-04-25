import { Cell, Pie, PieChart as RechartsPieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { IntentPoint } from '../../types';
import { Card } from '../ui/Card';

interface PieChartProps {
  data: IntentPoint[];
}

export const PieChart = ({ data }: PieChartProps) => {
  return (
    <Card title="Популярные интенты" animate>
      <div className="overflow-x-auto pb-1">
        <div className="h-64 min-w-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={1}>
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  borderColor: '#e2e8f0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-2">
        {data.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-slate-600">{entry.name}</span>
            </div>
            <span className="font-semibold text-slate-800">{entry.value}%</span>
          </div>
        ))}
      </div>
    </Card>
  );
};
