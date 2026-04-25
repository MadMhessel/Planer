import { motion } from 'framer-motion';
import { History, KeyRound, ShieldCheck } from 'lucide-react';
import { IntegrationGrid } from '../components/integrations/IntegrationGrid';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import type { Integration } from '../types';

const integrations: Integration[] = [
  {
    id: 'google-calendar',
    name: 'Гугл Календарь',
    description: 'Синхронизация расписания и встреч.',
    status: 'connected',
    lastSync: '2 мин назад',
    icon: 'К',
    color: '#2563eb',
  },
  {
    id: 'notion',
    name: 'Ноутион',
    description: 'Работа с заметками и внутренней документацией.',
    status: 'connected',
    lastSync: '5 мин назад',
    icon: 'Н',
    color: '#111827',
  },
  {
    id: 'slack',
    name: 'Слак',
    description: 'Обработка обращений в командных каналах.',
    status: 'disconnected',
    lastSync: '1 мин назад',
    icon: 'С',
    color: '#8b5cf6',
  },
  {
    id: 'hubspot',
    name: 'Хабспот',
    description: 'Синхронизация карточек клиентов и сделок.',
    status: 'disconnected',
    lastSync: '12 мин назад',
    icon: 'Х',
    color: '#f97316',
  },
  {
    id: 'telegram',
    name: 'Телеграм',
    description: 'Общение с пользователями в чат-боте.',
    status: 'connected',
    lastSync: '1 мин назад',
    icon: 'Т',
    color: '#0ea5e9',
  },
];

export const Integrations = () => {
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="flex justify-end">
        <Button variant="outline">
          <History className="h-4 w-4" />
          Журнал интеграций
        </Button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <Card title="Учётные данные АПИ" description="Подключение внешних сервисов через АПИ.">
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
            <Input label="АПИ-ключ" defaultValue="••••••••••••••••••••••a7f3" prefix={<KeyRound className="h-4 w-4" />} readOnly />
            <Input
              label="АПИ-секрет"
              defaultValue="••••••••••••••••••••••f9c2"
              prefix={<ShieldCheck className="h-4 w-4" />}
              readOnly
            />
            <div className="flex items-end gap-2">
              <Button variant="outline">Тест соединения</Button>
              <span className="mb-3 inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </div>
          </div>
        </Card>
      </motion.div>

      <IntegrationGrid integrations={integrations} />
    </div>
  );
};
