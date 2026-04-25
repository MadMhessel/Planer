import { ExternalLink, Globe, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { ChannelCard } from '../components/deploy/ChannelCard';
import { DeployButton } from '../components/deploy/DeployButton';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import type { Channel } from '../types';

const channels: Channel[] = [
  {
    id: 'telegram',
    name: 'Телеграм',
    handle: '@ЮристАссистент',
    connected: true,
    preview: 'Вы можете задать мне любой вопрос...',
  },
  {
    id: 'whatsapp',
    name: 'Ватсап',
    handle: '+1 (555) 123-4567',
    connected: true,
    preview: 'Вы можете задать мне любой вопрос...',
  },
  {
    id: 'web-widget',
    name: 'Веб-виджет',
    handle: 'бот.пример.рф',
    connected: true,
    preview: 'Вы можете задать мне любой вопрос...',
  },
  {
    id: 'slack',
    name: 'Слак',
    handle: '#поддержка',
    connected: true,
    preview: 'Вы можете задать мне любой вопрос...',
  },
  {
    id: 'email',
    name: 'Почта',
    handle: 'почта@пример.рф',
    connected: false,
    preview: 'Вы можете задать мне любой вопрос...',
  },
  {
    id: 'api',
    name: 'АПИ',
    handle: 'Запрос /v1/диалог',
    connected: false,
    preview: '{ "сообщение": "Вы можете задать мне любой вопрос..." }',
  },
];

export const Deploy = () => {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex flex-wrap items-stretch justify-between gap-3"
      >
        <Badge variant="success" className="px-3 py-1.5 text-sm">
          Подключено 4 канала
        </Badge>
        <div className="flex min-w-[280px] flex-1 flex-wrap items-center justify-between gap-3 rounded-card border border-slate-200 bg-white px-4 py-3 shadow-soft">
          <div>
            <p className="text-sm font-semibold text-slate-800">Ассистент в сети на 4 каналах</p>
            <p className="text-xs text-slate-500">Последний деплой: 31 мая 2025, 10:24</p>
          </div>
          <Button variant="outline" size="sm">
            Открыть вживую
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {channels.map((channel) => (
          <ChannelCard key={channel.id} channel={channel} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card title="Пользовательский домен" description="Публикация ассистента на вашем домене." animate>
          <div className="space-y-3">
            <Input defaultValue="https://бот.вашакомпания.рф" prefix={<Globe className="h-4 w-4" />} readOnly />
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                SSL-сертификат активен
              </span>
              <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600">Безопасный деплой</span>
              <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600">Без простоя</span>
            </div>
          </div>
        </Card>

        <DeployButton />
      </div>
    </div>
  );
};
